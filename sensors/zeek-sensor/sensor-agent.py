#!/usr/bin/env python3
import datetime
import hashlib
import hmac
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

CONTROLLER_URL = os.getenv('CONTROLLER_URL', '').rstrip('/')
SENSOR_ID = os.getenv('SENSOR_ID', 'sensor')
COMMAND_SECRET = os.getenv('SENSOR_COMMAND_SECRET', '')
CONTROLLER_TOKEN = os.getenv('CONTROLLER_TOKEN', '')
POLL_INTERVAL = int(os.getenv('PCAP_COMMAND_POLL_INTERVAL', '60'))
PCAP_MANAGER = os.getenv('PCAP_MANAGER', '/opt/sensor-tools/pcap-manager.sh')
EXPORT_DIR = pathlib.Path(os.getenv('PCAP_EXPORT_DIR', '/pcap/exports'))

if not CONTROLLER_URL:
    print('[sensor-agent] CONTROLLER_URL not set; agent disabled', flush=True)
    sys.exit(0)

EXPORT_DIR.mkdir(parents=True, exist_ok=True)


def log(msg):
    print(f"[sensor-agent] {msg}", flush=True)


def http_request(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header('Content-Type', 'application/json')
    if CONTROLLER_TOKEN:
        req.add_header('Authorization', f'Bearer {CONTROLLER_TOKEN}')
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def verify_signature(payload, signature):
    if not COMMAND_SECRET:
        return True
    body = json.dumps(payload, sort_keys=True).encode()
    expected = hmac.new(COMMAND_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or '')


def run_pcap_snapshot(duration, output_path):
    output_path = str(output_path)
    cmd = [PCAP_MANAGER, 'snapshot', str(duration), output_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"pcap snapshot failed: {result.stderr.strip()}")
    return output_path


def upload_file(local_path, url):
    parsed = urllib.parse.urlparse(url)
    headers = {}
    if 'X-Amz-Signature' in urllib.parse.parse_qs(parsed.query):
        headers['Content-Length'] = str(os.path.getsize(local_path))
    cmd = ['curl', '-sS', '-X', 'PUT', '--upload-file', local_path, url]
    for key, value in headers.items():
        cmd.extend(['-H', f'{key}: {value}'])
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"upload failed: {result.stderr.strip()}")


def complete_request(request_id, payload):
    url = f"{CONTROLLER_URL}/sensors/{SENSOR_ID}/pcap/{request_id}/complete"
    try:
        http_request('POST', url, payload)
    except Exception as exc:
        log(f"failed to report completion for {request_id}: {exc}")


def process_request(req):
    payload = req.get('command_payload') or {}
    signature = req.get('signature') or ''
    if not verify_signature(payload, signature):
        log(f"invalid signature for request {req.get('id')}; skipping")
        complete_request(req.get('id'), {'status': 'error', 'notes': 'signature verification failed'})
        return

    duration = int(payload.get('duration_seconds') or req.get('duration_seconds') or 300)
    download_url = payload.get('download_url') or req.get('download_url')
    if not download_url:
        complete_request(req.get('id'), {'status': 'error', 'notes': 'missing download_url'})
        return

    local_path = EXPORT_DIR / f"{req.get('id')}.tar.gz"

    start_time = datetime.datetime.utcnow() - datetime.timedelta(seconds=duration)
    end_time = datetime.datetime.utcnow()

    try:
        run_pcap_snapshot(duration, local_path)
        upload_file(str(local_path), download_url)
        size_bytes = local_path.stat().st_size
        complete_request(req.get('id'), {
            'status': 'ready',
            'start_time': start_time.isoformat() + 'Z',
            'end_time': end_time.isoformat() + 'Z',
            'size_bytes': size_bytes,
            'download_url': download_url
        })
        log(f"fulfilled request {req.get('id')} -> {download_url}")
    except Exception as exc:
        log(f"request {req.get('id')} failed: {exc}")
        complete_request(req.get('id'), {
            'status': 'error',
            'notes': str(exc)
        })
    finally:
        try:
            if local_path.exists():
                local_path.unlink()
        except Exception:
            pass


def poll_loop():
    while True:
        try:
            url = f"{CONTROLLER_URL}/sensors/{SENSOR_ID}/pcap/pending?limit=5"
            data = http_request('GET', url)
            for req in data.get('requests', []):
                process_request(req)
        except urllib.error.HTTPError as err:
            if err.code == 404:
                log('sensor not registered with controller')
            else:
                log(f"HTTP error: {err}")
        except Exception as exc:
            log(f"poll loop error: {exc}")
        time.sleep(max(POLL_INTERVAL, 5))


if __name__ == '__main__':
    poll_loop()

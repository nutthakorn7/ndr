#!/usr/bin/env python3
"""PCAP soak test driver.

Fires repeated PCAP snapshot requests against multiple sensors and validates
that the controller reports ready status with checksum + verification data.

Usage example:

    ./tests/pcap_soak_test.py \
        --controller-url http://localhost:8084 \
        --sensor sensor-edge-1 --sensor sensor-edge-2 \
        --cycles 5 --duration 60

Sensors must already be registered and actively polling the controller for
commands. Object storage credentials should be configured on the controller so
verification status is meaningful.
"""

import argparse
import collections
import sys
import time
from datetime import datetime

import requests

Result = collections.namedtuple('Result', 'sensor_id request_id status latency verification notes')


def request_pcap(controller_url, sensor_id, duration, expires_in):
    payload = {
        'duration_seconds': duration,
        'expires_in': expires_in
    }
    resp = requests.post(f"{controller_url}/sensors/{sensor_id}/pcap", json=payload, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data['request_id'], data.get('download_url')


def fetch_request(controller_url, sensor_id, request_id):
    params = {
        'limit': 1,
        'search': request_id
    }
    resp = requests.get(f"{controller_url}/sensors/{sensor_id}/pcap", params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if not data.get('requests'):
        return None
    return data['requests'][0]


def wait_for_completion(controller_url, sensor_id, request_id, timeout_seconds, poll_interval):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        req = fetch_request(controller_url, sensor_id, request_id)
        if req and req.get('status') in {'ready', 'error'}:
            return req
        time.sleep(poll_interval)
    return None


def run_cycle(args, sensor_id, cycle):
    print(f"[{datetime.utcnow().isoformat()}Z] Sensor {sensor_id}: cycle {cycle+1}/{args.cycles} → requesting {args.duration}s capture")
    request_id, _ = request_pcap(args.controller_url, sensor_id, args.duration, args.request_expiry)
    start = time.time()
    req = wait_for_completion(args.controller_url, sensor_id, request_id, args.timeout, args.poll_interval)
    latency = time.time() - start
    if not req:
        print(f"  ❌ Timeout waiting for {request_id} (>{args.timeout}s)")
        return Result(sensor_id, request_id, 'timeout', latency, None, 'timeout waiting for ready/error')
    status = req.get('status')
    checksum = req.get('checksum_sha256')
    verification = req.get('verification_status')
    notes = req.get('verification_notes') or req.get('notes')
    ready = status == 'ready' and checksum and (verification in {'verified', 'skipped'})
    symbol = '✅' if ready else ('⚠️' if status == 'ready' else '❌')
    print(f"  {symbol} {request_id} status={status} verification={verification} latency={latency:.1f}s checksum={checksum or 'n/a'}")
    return Result(sensor_id, request_id, status, latency, verification, notes)


def summarize(results):
    print('\n=== PCAP SOAK SUMMARY ===')
    totals = collections.Counter(res.status for res in results)
    ready = totals.get('ready', 0)
    errors = totals.get('error', 0)
    timeouts = totals.get('timeout', 0)
    print(f"Ready: {ready} | Errors: {errors} | Timeouts: {timeouts}")
    latencies = [res.latency for res in results if res.status == 'ready']
    if latencies:
        avg = sum(latencies) / len(latencies)
        print(f"Avg latency: {avg:.1f}s (min {min(latencies):.1f}s / max {max(latencies):.1f}s)")
    unstable = [res for res in results if res.status == 'ready' and res.verification not in {'verified', 'skipped'}]
    if unstable:
        print('\n⚠️  Verification anomalies:')
        for res in unstable:
            print(f"  - {res.sensor_id} {res.request_id} verification={res.verification} notes={res.notes}")
    failures = [res for res in results if res.status in {'error', 'timeout'}]
    if failures:
        print('\n❌ Failures:')
        for res in failures:
            print(f"  - {res.sensor_id} {res.request_id} status={res.status} notes={res.notes}")


def parse_args():
    parser = argparse.ArgumentParser(description='PCAP soak-test driver')
    parser.add_argument('--controller-url', default='http://localhost:8084', help='Sensor controller base URL')
    parser.add_argument('--sensor', dest='sensors', action='append', required=True, help='Sensor ID to test (repeatable)')
    parser.add_argument('--cycles', type=int, default=3, help='Number of requests per sensor')
    parser.add_argument('--duration', type=int, default=60, help='Capture duration in seconds')
    parser.add_argument('--request-expiry', type=int, default=1800, help='Command expiry in seconds')
    parser.add_argument('--timeout', type=int, default=900, help='Seconds to wait for completion per request')
    parser.add_argument('--poll-interval', type=int, default=10, help='Seconds between status polls')
    parser.add_argument('--sleep-between', type=int, default=5, help='Seconds between cycles per sensor')
    return parser.parse_args()


def main():
    args = parse_args()
    results = []
    try:
        for sensor_id in args.sensors:
            for cycle in range(args.cycles):
                try:
                    res = run_cycle(args, sensor_id, cycle)
                    results.append(res)
                except requests.HTTPError as err:
                    print(f"  ❌ Controller returned HTTP error: {err}")
                    results.append(Result(sensor_id, 'n/a', 'error', 0, None, str(err)))
                except Exception as exc:
                    print(f"  ❌ Unexpected error: {exc}")
                    results.append(Result(sensor_id, 'n/a', 'error', 0, None, str(exc)))
                time.sleep(args.sleep_between)
    except KeyboardInterrupt:
        print('\nInterrupted by user.')
    summarize(results)
    failures = [res for res in results if res.status in {'error', 'timeout'}]
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()

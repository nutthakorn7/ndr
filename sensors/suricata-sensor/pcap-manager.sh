#!/usr/bin/env bash
set -euo pipefail

COMMAND=${1:-help}
CAPTURE_IFACE=${CAPTURE_INTERFACE:-eth0}
RING_DIR=${PCAP_RING_DIR:-/pcap/ring}
PID_FILE=${PCAP_RING_PID_FILE:-${RING_DIR}/.pcap_ring.pid}
LOG_FILE=${PCAP_RING_LOG_FILE:-/var/log/pcap-ring.log}
ROTATE_SECONDS=${PCAP_RING_ROTATE_SECONDS:-60}
FILE_COUNT=${PCAP_RING_FILE_COUNT:-20}
EXPORT_DIR=${PCAP_EXPORT_DIR:-/pcap/exports}

start_ring() {
  mkdir -p "${RING_DIR}" "${EXPORT_DIR}" $(dirname "${LOG_FILE}")
  if [[ -f "${PID_FILE}" ]] && kill -0 "$(cat "${PID_FILE}")" 2>/dev/null; then
    echo "pcap ring already running (pid $(cat "${PID_FILE}"))"
    return
  fi

  local cmd
  if command -v dumpcap >/dev/null 2>&1; then
    cmd="dumpcap -n -s 0 -i ${CAPTURE_IFACE} -b duration:${ROTATE_SECONDS} -b files:${FILE_COUNT} -w ${RING_DIR}/ring.pcap"
  else
    cmd="tcpdump -i ${CAPTURE_IFACE} -s 0 -G ${ROTATE_SECONDS} -W ${FILE_COUNT} -w ${RING_DIR}/ring.pcap"
  fi

  nohup bash -c "${cmd}" >>"${LOG_FILE}" 2>&1 &
  echo $! > "${PID_FILE}"
  echo "pcap ring started (pid $(cat "${PID_FILE}"))"
}

stop_ring() {
  if [[ -f "${PID_FILE}" ]]; then
    local pid=$(cat "${PID_FILE}")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      wait "$pid" 2>/dev/null || true
      echo "stopped pcap ring (pid $pid)"
    fi
    rm -f "${PID_FILE}"
  fi
}

snapshot_ring() {
  local duration=${1:-300}
  local output=${2:-${EXPORT_DIR}/pcap-$(date +%s).tar.gz}
  mkdir -p "${EXPORT_DIR}" $(dirname "${output}")

  if [[ ! -d "${RING_DIR}" ]]; then
    echo "ring directory ${RING_DIR} missing" >&2
    exit 1
  }

  local needed=$(( (duration + ROTATE_SECONDS - 1) / ROTATE_SECONDS ))
  local files=( $(ls -1t ${RING_DIR}/*.pcap 2>/dev/null | head -n "${needed}") ) || true

  if [[ ${#files[@]} -eq 0 ]]; then
    echo "no pcap ring data available" >&2
    exit 1
  fi

  tar -czf "${output}" "${files[@]}"
  echo "snapshot written to ${output} (covering ~${duration}s)"
}

capture_window() {
  local duration=${1:-60}
  local output=${2:-${EXPORT_DIR}/capture-$(date +%s).pcap}
  mkdir -p "${EXPORT_DIR}" $(dirname "${output}")
  tcpdump -i "${CAPTURE_IFACE}" -s 0 -G "${duration}" -W 1 -w "${output}"
  echo "active capture stored at ${output}"
}

usage() {
  cat <<USAGE
Usage: $0 <command> [args]
Commands:
  start                 Start rotating pcap capture
  stop                  Stop rotating capture
  snapshot <seconds> <output.tar.gz>
                        Package recent ring files covering ~seconds
  capture <seconds> <output.pcap>
                        Start an active capture for the requested window
  help                  Show this message
Environment:
  CAPTURE_INTERFACE (${CAPTURE_IFACE})
  PCAP_RING_DIR (${RING_DIR})
  PCAP_RING_ROTATE_SECONDS (${ROTATE_SECONDS})
  PCAP_RING_FILE_COUNT (${FILE_COUNT})
  PCAP_EXPORT_DIR (${EXPORT_DIR})
USAGE
}

case "${COMMAND}" in
  start) start_ring ;;
  stop) stop_ring ;;
  snapshot) snapshot_ring "${2:-300}" "${3:-}" ;;
  capture) capture_window "${2:-60}" "${3:-}" ;;
  help|*) usage ;;
esac

#!/usr/bin/env bash
set -euo pipefail

CAPTURE_INTERFACE=${CAPTURE_INTERFACE:-eth0}
PCAP_FILE=${PCAP_FILE:-}
ZEEK_BPF=${ZEEK_BPF:-""}
VECTOR_CONFIG=${VECTOR_CONFIG:-/etc/vector/vector.toml}
ZEEK_LOG_DIR=${ZEEK_LOG_DIR:-/opt/zeek/logs/current}
SENSOR_ID=${SENSOR_ID:-zeek-sensor}

cleanup() {
  echo "[entrypoint] Caught signal, shutting down" >&2
  pkill vector || true
  pkill zeek || true
}

trap cleanup SIGINT SIGTERM

mkdir -p "${ZEEK_LOG_DIR}"
vector --config "$VECTOR_CONFIG" &
VECTOR_PID=$!

echo "[entrypoint] Started Vector (PID ${VECTOR_PID})"

ZEEK_CMD=(zeek -C LogAscii::use_json=T LogAscii::json_timestamps=JSON::TS_ISO8601 \
  LogAscii::json_timestamps_precision=JSON::TS_MILLI LogAscii::include_meta=T)

if [[ -n "$ZEEK_BPF" ]]; then
  ZEEK_CMD+=("redef" "PacketFilter::default_monitor_filter=\"$ZEEK_BPF\"")
fi

if [[ -n "$PCAP_FILE" ]]; then
  echo "[entrypoint] Running Zeek on PCAP $PCAP_FILE" >&2
  ZEEK_CMD+=(-r "$PCAP_FILE")
else
  echo "[entrypoint] Running Zeek on interface $CAPTURE_INTERFACE" >&2
  ZEEK_CMD+=(-i "$CAPTURE_INTERFACE")
fi

ZEEK_CMD+=(local)

"${ZEEK_CMD[@]}" &
ZEEK_PID=$!

echo "[entrypoint] Zeek PID ${ZEEK_PID} started"

wait $ZEEK_PID
wait $VECTOR_PID

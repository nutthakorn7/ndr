#!/usr/bin/env bash
set -euo pipefail

CAPTURE_INTERFACE=${CAPTURE_INTERFACE:-eth0}
PCAP_FILE=${PCAP_FILE:-}
SURICATA_ARGS=${SURICATA_ARGS:-""}
VECTOR_CONFIG=${VECTOR_CONFIG:-/etc/vector/vector.toml}
SENSOR_ID=${SENSOR_ID:-suricata-sensor}
TENANT_ID=${TENANT_ID:-default}
PCAP_RING_ENABLED=${PCAP_RING_ENABLED:-true}
PCAP_MANAGER=/opt/sensor-tools/pcap-manager.sh
SENSOR_AGENT=/opt/sensor-tools/sensor-agent.py

cleanup() {
  echo "[entrypoint] Caught signal, shutting down" >&2
  pkill vector || true
  pkill suricata || true
  if [[ -x "$PCAP_MANAGER" ]]; then
    "$PCAP_MANAGER" stop || true
  fi
  pkill -f sensor-agent.py || true
}

trap cleanup SIGINT SIGTERM

mkdir -p /var/lib/suricata/log

vector --config "$VECTOR_CONFIG" &
VECTOR_PID=$!

echo "[entrypoint] Started Vector (PID ${VECTOR_PID})"

if [[ "${PCAP_RING_ENABLED,,}" == "true" && -x "$PCAP_MANAGER" ]]; then
  CAPTURE_INTERFACE="$CAPTURE_INTERFACE" "$PCAP_MANAGER" start
fi

if [[ -n "${CONTROLLER_URL:-}" && -x "$SENSOR_AGENT" ]]; then
  echo "[entrypoint] Starting sensor agent for controller integration"
  python3 "$SENSOR_AGENT" &
fi

SURICATA_CMD=(suricata -c /etc/suricata/suricata.yaml --user suricata --group suricata)

if [[ -n "$PCAP_FILE" ]]; then
  echo "[entrypoint] Running Suricata on PCAP $PCAP_FILE" >&2
  SURICATA_CMD+=( -r "$PCAP_FILE" )
else
  echo "[entrypoint] Running Suricata on interface $CAPTURE_INTERFACE" >&2
  SURICATA_CMD+=( -i "$CAPTURE_INTERFACE" )
fi

if [[ -n "$SURICATA_ARGS" ]]; then
  SURICATA_CMD+=( $SURICATA_ARGS )
fi

SURICATA_CMD+=( -k none )

"${SURICATA_CMD[@]}" &
SURICATA_PID=$!

echo "[entrypoint] Suricata PID ${SURICATA_PID} started"

wait $SURICATA_PID
wait $VECTOR_PID

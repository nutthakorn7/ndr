FROM ghcr.io/oisf/suricata:7.0

ARG VECTOR_VERSION=0.37.1-1

ENV SURICATA_HOME=/var/lib/suricata \
    VECTOR_CONFIG=/etc/vector/vector.toml \
    SURICATA_YAML=/etc/suricata/suricata.yaml

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates gnupg tcpdump python3 && \
    curl -1sLf 'https://repositories.timber.io/public/vector/cfg/setup/bash.deb.sh' | bash && \
    apt-get install -y vector=${VECTOR_VERSION} && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/vector ${SURICATA_HOME}/log /opt/sensor-tools && \
    chown -R suricata:suricata ${SURICATA_HOME}

COPY suricata.yaml ${SURICATA_YAML}
COPY vector/vector.toml /etc/vector/vector.toml
COPY pcap-manager.sh /opt/sensor-tools/pcap-manager.sh
COPY sensor-agent.py /opt/sensor-tools/sensor-agent.py
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh /opt/sensor-tools/pcap-manager.sh /opt/sensor-tools/sensor-agent.py

USER suricata

ENTRYPOINT ["/entrypoint.sh"]

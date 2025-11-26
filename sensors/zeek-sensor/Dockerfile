FROM zeek/zeek:6.0

ARG VECTOR_VERSION=0.37.1-1

ENV ZEEK_LOG_DIR=/opt/zeek/logs/current \
    VECTOR_CONFIG=/etc/vector/vector.toml

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates gnupg tcpdump python3 && \
    curl -1sLf 'https://repositories.timber.io/public/vector/cfg/setup/bash.deb.sh' | bash && \
    apt-get install -y vector=${VECTOR_VERSION} && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/vector /opt/zeek/share/zeek/site/local /opt/sensor-tools && \
    chown -R zeek:zeek /opt/zeek/logs

COPY zeek.local.cfg /opt/zeek/share/zeek/site/local/zeek.local.cfg
COPY vector/vector.toml /etc/vector/vector.toml
COPY pcap-manager.sh /opt/sensor-tools/pcap-manager.sh
COPY sensor-agent.py /opt/sensor-tools/sensor-agent.py
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh /opt/sensor-tools/pcap-manager.sh /opt/sensor-tools/sensor-agent.py

USER zeek

ENTRYPOINT ["/entrypoint.sh"]

FROM rust:latest as builder

WORKDIR /usr/src/app

# Install libpcap-dev for pcap crate
RUN apt-get update && apt-get install -y libpcap-dev

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim

WORKDIR /usr/local/bin

COPY --from=builder /usr/src/app/target/release/rust-pcap-service .

# Install runtime dependencies
RUN apt-get update && apt-get install -y libpcap0.8 ca-certificates && rm -rf /var/lib/apt/lists/*

# Create pcap directory
RUN mkdir -p /data/pcap

CMD ["./rust-pcap-service"]

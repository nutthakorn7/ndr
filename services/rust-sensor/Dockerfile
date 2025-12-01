# Build Stage
FROM rust:latest as builder

WORKDIR /usr/src/app
COPY . .

# Install libpcap and cmake for compilation
RUN apt-get update && apt-get install -y libpcap-dev cmake build-essential libsasl2-dev

# Build release binary
RUN cargo build --release

# Runtime Stage
FROM debian:bookworm-slim

# Install libpcap for runtime
RUN apt-get update && apt-get install -y libpcap0.8 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/rust-sensor /usr/local/bin/rust-sensor

# Run with RUST_LOG=info by default
ENV RUST_LOG=info

CMD ["rust-sensor"]

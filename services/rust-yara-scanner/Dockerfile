FROM rust:latest as builder

WORKDIR /usr/src/app

# Install build dependencies for YARA
RUN apt-get update && apt-get install -y cmake libyara-dev

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim

WORKDIR /usr/local/bin

COPY --from=builder /usr/src/app/target/release/rust-yara-scanner .

# Install runtime dependencies
RUN apt-get update && apt-get install -y libssl-dev ca-certificates libyara10 && rm -rf /var/lib/apt/lists/*

# Create rules directory
RUN mkdir -p /app/rules

CMD ["./rust-yara-scanner"]

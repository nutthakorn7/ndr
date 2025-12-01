FROM rust:latest as builder

WORKDIR /usr/src/app

# Install build dependencies for rdkafka
RUN apt-get update && apt-get install -y cmake libssl-dev zlib1g-dev

COPY . .

RUN cargo build --release

FROM debian:bookworm-slim

WORKDIR /usr/local/bin

COPY --from=builder /usr/src/app/target/release/rust-soar-orchestrator .

# Install runtime dependencies
RUN apt-get update && apt-get install -y libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

CMD ["./rust-soar-orchestrator"]

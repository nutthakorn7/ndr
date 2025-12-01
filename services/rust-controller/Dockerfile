# Build Stage
FROM rust:latest as builder

WORKDIR /usr/src/app
COPY . .

# Install build dependencies (if any needed for sqlx/openssl)
RUN apt-get update && apt-get install -y pkg-config libssl-dev

RUN cargo build --release

# Runtime Stage
FROM debian:bookworm-slim

WORKDIR /usr/src/app

# Install runtime dependencies
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/rust-controller /usr/local/bin/rust-controller

ENV RUST_LOG=info

CMD ["rust-controller"]

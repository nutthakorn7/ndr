FROM rust:latest as builder

WORKDIR /app
RUN apt-get update && apt-get install -y cmake build-essential libssl-dev pkg-config zlib1g-dev
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates libssl-dev && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/rust-asset-service .

ENV RUST_LOG=info

CMD ["./rust-asset-service"]

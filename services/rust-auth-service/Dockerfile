FROM rust:latest as builder

WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/rust-auth-service .
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

ENV RUST_LOG=info
ENV PORT=8087

CMD ["./rust-auth-service"]

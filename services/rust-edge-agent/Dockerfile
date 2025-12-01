FROM rust:1.75 as builder

WORKDIR /app

# Copy manifests
COPY Cargo.toml ./

# Create dummy main to cache dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy source code
COPY src ./src

# Build for release
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y libssl3 ca-certificates sqlite3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/rust-edge-agent /usr/local/bin/rust-edge-agent

# Create data directory
RUN mkdir -p /var/lib/edge-agent

ENV BUFFER_DB_PATH=/var/lib/edge-agent/buffer.db
ENV RUST_LOG=info
ENV PORT=8086

EXPOSE 8086

CMD ["rust-edge-agent"]

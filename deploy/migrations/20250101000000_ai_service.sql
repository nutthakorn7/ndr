-- Create table for storing trained AI models
CREATE TABLE IF NOT EXISTS ai_models (
    id SERIAL PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL, -- e.g., 'kmeans_anomaly'
    version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    hyperparameters JSONB, -- e.g., { "k": 2, "threshold": 2.0 }
    artifacts JSONB, -- e.g., { "centroids": [[...], [...]] }
    metrics JSONB, -- e.g., { "training_loss": 0.1 }
    is_active BOOLEAN DEFAULT false
);

-- Create table for storing network flow data (training data)
-- In a real system, this might be populated by the ingestion pipeline
CREATE TABLE IF NOT EXISTS network_flows (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    src_ip INET,
    dst_ip INET,
    src_port INTEGER,
    dst_port INTEGER,
    protocol VARCHAR(10),
    bytes_sent BIGINT,
    bytes_received BIGINT,
    packets_sent BIGINT,
    packets_received BIGINT,
    duration REAL, -- seconds
    app_protocol VARCHAR(20)
);

-- Create index for efficient time-range queries during training
CREATE INDEX IF NOT EXISTS idx_network_flows_timestamp ON network_flows(timestamp);

-- Seed network_flows with synthetic data for AI training
-- Cluster 1: Small flows (DNS/HTTP-like)
INSERT INTO network_flows (src_ip, dst_ip, src_port, dst_port, protocol, bytes_sent, bytes_received, packets_sent, packets_received, duration, app_protocol)
SELECT 
    '192.168.1.10'::inet,
    '8.8.8.8'::inet,
    (random() * 50000 + 1024)::int,
    53,
    'UDP',
    (random() * 200 + 50)::bigint, -- 50-250 bytes
    (random() * 500 + 100)::bigint, -- 100-600 bytes
    (random() * 5 + 1)::bigint,
    (random() * 5 + 1)::bigint,
    (random() * 0.1 + 0.01)::real, -- Short duration
    'DNS'
FROM generate_series(1, 500);

-- Cluster 2: Medium flows (Web browsing)
INSERT INTO network_flows (src_ip, dst_ip, src_port, dst_port, protocol, bytes_sent, bytes_received, packets_sent, packets_received, duration, app_protocol)
SELECT 
    '192.168.1.20'::inet,
    '104.21.55.2'::inet,
    (random() * 50000 + 1024)::int,
    443,
    'TCP',
    (random() * 5000 + 1000)::bigint, -- 1KB-6KB
    (random() * 20000 + 5000)::bigint, -- 5KB-25KB
    (random() * 20 + 5)::bigint,
    (random() * 30 + 10)::bigint,
    (random() * 2.0 + 0.5)::real, -- Medium duration
    'HTTPS'
FROM generate_series(1, 500);

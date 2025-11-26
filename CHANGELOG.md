# Changelog

## 2025-08-02

- Preserve upstream ECS fields inside the parser/normalizer and correctly merge user/process/file metadata.
- Add per-log validation and size limits to `/ingest/logs/batch` for safer ingestion.
- Wait for Kafka acknowledgements when publishing alerts from the detection engine.
- Require `JWT_SECRET` (with optional `ENABLE_DEMO_USERS`) before starting the authz service.
- Make the pipeline integration test portable by resolving repo-relative paths.

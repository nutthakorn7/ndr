-- Initialize the auth_logs database
-- This file is automatically executed when the PostgreSQL container starts

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The actual tables will be created by SQLAlchemy models
-- This file is mainly for any custom initialization if needed

-- Set timezone
SET timezone = 'UTC';

-- Create a comment
COMMENT ON DATABASE auth_logs IS 'Authentication Log Management System Database'; 
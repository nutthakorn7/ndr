"""
Script to run all tests and fix remaining issues.
"""
import os
import sys
import subprocess
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='test_run.log'
)
logger = logging.getLogger(__name__)

def run_command(command, cwd=None):
    """Run a shell command and return output."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            check=True,
            capture_output=True,
            text=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def setup_environment():
    """Setup test environment."""
    logger.info("Setting up test environment...")
    
    # Create required directories
    directories = ['logs', 'exports', 'templates']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    # Create .env file if not exists
    if not os.path.exists('.env'):
        with open('.env', 'w') as f:
            f.write("""
DEBUG=true
LOG_LEVEL=DEBUG
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/zcrlog
REDIS_HOST=localhost
REDIS_PORT=6379
AI_HOST=http://localhost:11434
""".strip())
    
    # Install dependencies
    success, output = run_command("python3 -m pip install -r requirements.txt")
    if not success:
        logger.error(f"Failed to install dependencies: {output}")
        return False
    
    # Install test dependencies
    success, output = run_command("python3 -m pip install -r test_requirements.txt")
    if not success:
        logger.error(f"Failed to install test dependencies: {output}")
        return False
    
    return True

def run_database_migrations():
    """Run database migrations."""
    logger.info("Running database migrations...")
    
    # Run PostgreSQL migrations
    success, output = run_command(
        "python -c 'from backend.app.database import init_db; init_db()'"
    )
    if not success:
        logger.error(f"Failed to run database migrations: {output}")
        return False
    
    # Run ClickHouse migrations
    success, output = run_command(
        "clickhouse-client --multiline --queries-file database/clickhouse_init.sql"
    )
    if not success:
        logger.warning(f"ClickHouse migration warning: {output}")
    
    return True

def run_unit_tests():
    """Run unit tests."""
    logger.info("Running unit tests...")
    
    success, output = run_command("pytest backend/app/test_*.py -v")
    if not success:
        logger.error(f"Unit tests failed: {output}")
        return False
    
    logger.info("Unit tests passed")
    return True

def run_integration_tests():
    """Run integration tests."""
    logger.info("Running integration tests...")
    
    success, output = run_command("pytest backend/tests/ -v")
    if not success:
        logger.error(f"Integration tests failed: {output}")
        return False
    
    logger.info("Integration tests passed")
    return True

def run_system_tests():
    """Run system tests."""
    logger.info("Running system tests...")
    
    success, output = run_command("python backend/test_system.py")
    if not success:
        logger.error(f"System tests failed: {output}")
        return False
    
    logger.info("System tests passed")
    return True

def check_services():
    """Check if required services are running."""
    logger.info("Checking required services...")
    
    services = {
        "PostgreSQL": "pg_isready",
        "Redis": "redis-cli ping",
        "ClickHouse": "clickhouse-client --query 'SELECT 1'",
        "Ollama": "curl -s http://localhost:11434/api/tags"
    }
    
    for service, command in services.items():
        success, output = run_command(command)
        if not success:
            logger.error(f"{service} is not running: {output}")
            return False
        logger.info(f"{service} is running")
    
    return True

def fix_common_issues():
    """Fix common issues."""
    logger.info("Fixing common issues...")
    
    fixes = [
        # Fix permissions
        "chmod -R 755 backend/app",
        "chmod -R 755 logs",
        "chmod -R 755 exports",
        
        # Clean up temp files
        "find . -name '*.pyc' -delete",
        "find . -name '__pycache__' -delete",
        
        # Reset database
        "dropdb zcrlog --if-exists",
        "createdb zcrlog",
        
        # Clear Redis cache
        "redis-cli FLUSHALL",
        
        # Restart services
        "systemctl restart postgresql",
        "systemctl restart redis",
        "systemctl restart clickhouse-server",
    ]
    
    for fix in fixes:
        success, output = run_command(fix)
        if not success:
            logger.warning(f"Fix failed: {fix} - {output}")
    
    return True

def main():
    """Main entry point."""
    try:
        logger.info("Starting test run...")
        start_time = datetime.now()
        
        # Setup environment
        if not setup_environment():
            logger.error("Environment setup failed")
            return False
        
        # Check services
        if not check_services():
            logger.error("Required services check failed")
            return False
        
        # Fix common issues
        if not fix_common_issues():
            logger.error("Failed to fix common issues")
            return False
        
        # Run database migrations
        if not run_database_migrations():
            logger.error("Database migrations failed")
            return False
        
        # Run tests
        tests_passed = all([
            run_unit_tests(),
            run_integration_tests(),
            run_system_tests()
        ])
        
        # Log summary
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(f"Test run completed in {duration:.2f} seconds")
        logger.info(f"Tests {'PASSED' if tests_passed else 'FAILED'}")
        
        return tests_passed
        
    except Exception as e:
        logger.error(f"Test run failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
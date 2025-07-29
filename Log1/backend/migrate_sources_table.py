#!/usr/bin/env python3
"""
Database migration script to add missing columns to log_sources table
"""

import psycopg2
import os
from urllib.parse import urlparse

def get_db_connection():
    """Get database connection from environment variables"""
    # Use Docker service name for host
    return psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'postgres'),
        port=int(os.getenv('POSTGRES_PORT', 5432)),
        database=os.getenv('POSTGRES_DB', 'auth_logs'),
        user=os.getenv('POSTGRES_USER', 'postgres'),
        password=os.getenv('POSTGRES_PASSWORD', 'postgres')
    )

def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = %s AND column_name = %s
    """, (table_name, column_name))
    return cursor.fetchone() is not None

def migrate_log_sources_table():
    """Add missing columns to log_sources table"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print("Checking log_sources table structure...")
        
        # Check current table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'log_sources'
            ORDER BY ordinal_position
        """)
        
        existing_columns = cursor.fetchall()
        print(f"Current columns: {[col[0] for col in existing_columns]}")
        
        # Define new columns to add
        new_columns = [
            ("vendor", "VARCHAR(50)"),
            ("model", "VARCHAR(100)"),
            ("os_version", "VARCHAR(50)"),
            ("device_profile_id", "VARCHAR(36)")
        ]
        
        # Add missing columns
        for column_name, column_type in new_columns:
            if not check_column_exists(cursor, 'log_sources', column_name):
                print(f"Adding column: {column_name} {column_type}")
                cursor.execute(f"""
                    ALTER TABLE log_sources 
                    ADD COLUMN {column_name} {column_type}
                """)
            else:
                print(f"Column {column_name} already exists")
        
        # Create device_profiles table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS device_profiles (
                id VARCHAR(36) PRIMARY KEY,
                vendor VARCHAR(50) NOT NULL,
                model VARCHAR(100),
                os_version VARCHAR(50),
                log_format VARCHAR(50),
                connection_methods JSON,
                log_patterns JSON,
                sample_logs JSON,
                parser_config JSON,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("Created/verified device_profiles table")
        
        # Add foreign key constraint if it doesn't exist
        cursor.execute("""
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'log_sources' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name = 'fk_log_sources_device_profile'
        """)
        
        if not cursor.fetchone():
            try:
                cursor.execute("""
                    ALTER TABLE log_sources 
                    ADD CONSTRAINT fk_log_sources_device_profile 
                    FOREIGN KEY (device_profile_id) 
                    REFERENCES device_profiles(id)
                """)
                print("Added foreign key constraint")
            except psycopg2.Error as e:
                print(f"Note: Could not add foreign key constraint: {e}")
        else:
            print("Foreign key constraint already exists")
        
        # Commit changes
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Show final table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'log_sources'
            ORDER BY ordinal_position
        """)
        
        final_columns = cursor.fetchall()
        print(f"\nFinal table structure:")
        for col in final_columns:
            nullable = "NULL" if col[2] == "YES" else "NOT NULL"
            print(f"  {col[0]}: {col[1]} {nullable}")
            
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_log_sources_table() 
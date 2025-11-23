import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

def create_database():
    # Get DB URL from env
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not set in .env")
        return

    # Parse the URL to get credentials
    # Format: postgresql+asyncpg://user:password@host:port/dbname
    # We need to strip '+asyncpg' for urlparse to work correctly with standard schemes, 
    # or just handle it manually.
    
    # Simple parsing assuming standard format
    try:
        # Remove +asyncpg if present
        clean_url = db_url.replace('+asyncpg', '')
        result = urlparse(clean_url)
        
        username = result.username
        password = result.password
        host = result.hostname
        port = result.port or 5432
        target_dbname = result.path.lstrip('/')
        
        print(f"Attempting to create database '{target_dbname}' on {host}:{port} as user '{username}'...")

        # Connect to 'postgres' default database to create the new one
        con = psycopg2.connect(
            dbname='postgres',
            user=username,
            host=host,
            password=password,
            port=port
        )
        
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = con.cursor()
        
        # Check if exists
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{target_dbname}'")
        exists = cur.fetchone()
        
        if not exists:
            cur.execute(f"CREATE DATABASE {target_dbname}")
            print(f"Database '{target_dbname}' created successfully!")
        else:
            print(f"Database '{target_dbname}' already exists.")
            
        cur.close()
        con.close()
        
    except Exception as e:
        print(f"Failed to create database: {e}")
        print("Please create it manually using pgAdmin or 'createdb saturday_smashers'.")

if __name__ == "__main__":
    create_database()

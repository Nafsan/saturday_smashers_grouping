import psycopg2
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

def enable_rls_all_tables():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not set")
        return

    clean_url = db_url.replace('+asyncpg', '')
    result = urlparse(clean_url)
    
    try:
        conn = psycopg2.connect(
            dbname=result.path.lstrip('/'),
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port or 5432
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # Get all tables in public schema
        cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
        tables = [row[0] for row in cur.fetchall()]
        
        if not tables:
            print("No tables found in public schema.")
            return
            
        print(f"Enabling RLS on {len(tables)} tables...")
        for table in tables:
            try:
                cur.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;')
                print(f"[OK] Enabled RLS on: {table}")
            except Exception as e:
                print(f"[ERROR] Failed to enable RLS on {table}: {e}")
            
        print("\nRLS Enablement Complete!")
        print("NOTE: Tables are now restricted. Please add appropriate access policies as needed.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Database connection error: {e}")

if __name__ == "__main__":
    enable_rls_all_tables()

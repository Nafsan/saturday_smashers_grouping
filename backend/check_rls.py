import psycopg2
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

def check_rls():
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
        cur = conn.cursor()
        
        cur.execute("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';")
        tables = cur.fetchall()
        
        if not tables:
            print("No tables found in public schema.")
            return
            
        print(f"{'Table Name':<30} | {'RLS Enabled'}")
        print("-" * 45)
        for table, rls in tables:
            print(f"{table:<30} | {rls}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_rls()

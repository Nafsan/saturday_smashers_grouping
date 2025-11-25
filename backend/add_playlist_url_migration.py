import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment variables")
    exit(1)

# Fix for Render/Heroku which use postgres:// or postgresql:// but SQLAlchemy needs postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def run_migration():
    print(f"Connecting to database...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        async with engine.begin() as conn:
            # Add playlist_url column if it doesn't exist
            await conn.execute(text("""
                ALTER TABLE tournaments 
                ADD COLUMN IF NOT EXISTS playlist_url VARCHAR(500)
            """))
            print("✓ Added playlist_url column to tournaments table")
            
            # Add embed_url column if it doesn't exist
            await conn.execute(text("""
                ALTER TABLE tournaments 
                ADD COLUMN IF NOT EXISTS embed_url TEXT
            """))
            print("✓ Added embed_url column to tournaments table")
            
            print("✓ Migration completed successfully")
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())

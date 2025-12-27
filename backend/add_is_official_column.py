"""
Migration script to add is_official column to tournaments table.
All existing tournaments will be marked as official (is_official=True).
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment variables")
    print("Please set it using: $env:DATABASE_URL = \"your_database_url\"")
    exit(1)

# Fix for Render/Heroku which use postgres:// or postgresql:// but SQLAlchemy needs postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


async def run_migration():
    """Add is_official column to tournaments table with default value True"""
    
    print("=" * 60)
    print("MIGRATION: Add is_official column to tournaments table")
    print("=" * 60)
    print(f"Connecting to database...")
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        async with engine.begin() as conn:
            print("Adding is_official column to tournaments table...")
            
            # Add the column with default value
            await conn.execute(text(
                "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT TRUE"
            ))
            
            print("✓ Column added successfully")
            
            # Update all existing tournaments to be official
            result = await conn.execute(text(
                "UPDATE tournaments SET is_official = TRUE WHERE is_official IS NULL"
            ))
            
            print(f"✓ Updated {result.rowcount} existing tournaments to is_official=TRUE")
            
            # Verify the change
            count_result = await conn.execute(text(
                "SELECT COUNT(*) FROM tournaments WHERE is_official = TRUE"
            ))
            count = count_result.scalar()
            print(f"✓ Total official tournaments: {count}")
            
            print("\n✅ Migration completed successfully!")
    
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())


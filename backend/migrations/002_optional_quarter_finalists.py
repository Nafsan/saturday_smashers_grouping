"""
Migration: Make quarter finalists optional in club_tournament_results table.
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
    exit(1)

# Fix connection string for asyncpg
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


async def run_migration():
    """Make quarter finalists optional."""

    print("=" * 60)
    print("MIGRATION: Make quarter finalists optional")
    print("=" * 60)
    print("Connecting to database...")

    engine = create_async_engine(DATABASE_URL, echo=False)

    try:
        async with engine.begin() as conn:
            print("Altering club_tournament_results table...")
            await conn.execute(text("""
                ALTER TABLE club_tournament_results
                ALTER COLUMN quarter_finalist_1 DROP NOT NULL,
                ALTER COLUMN quarter_finalist_2 DROP NOT NULL,
                ALTER COLUMN quarter_finalist_3 DROP NOT NULL,
                ALTER COLUMN quarter_finalist_4 DROP NOT NULL;
            """))
            print("✓ club_tournament_results table altered")

            print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())

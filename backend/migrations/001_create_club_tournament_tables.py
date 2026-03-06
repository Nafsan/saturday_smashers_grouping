"""
Migration: Create club tournament tables (club_venues, club_tournaments, club_tournament_results).
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
    """Create club tournament tables."""

    print("=" * 60)
    print("MIGRATION: Create club tournament tables")
    print("=" * 60)
    print("Connecting to database...")

    engine = create_async_engine(DATABASE_URL, echo=False)

    try:
        async with engine.begin() as conn:
            # 1. Create club_venues table
            print("Creating club_venues table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS club_venues (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    logo_base64 TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            print("✓ club_venues table created")

            # 2. Create club_tournaments table
            print("Creating club_tournaments table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS club_tournaments (
                    id SERIAL PRIMARY KEY,
                    venue_id INTEGER NOT NULL REFERENCES club_venues(id),
                    category VARCHAR(255) NOT NULL,
                    tournament_datetime TIMESTAMP NOT NULL,
                    announcement TEXT,
                    total_players INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            print("✓ club_tournaments table created")

            # 3. Create club_tournament_results table
            print("Creating club_tournament_results table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS club_tournament_results (
                    id SERIAL PRIMARY KEY,
                    tournament_id INTEGER UNIQUE NOT NULL REFERENCES club_tournaments(id) ON DELETE CASCADE,
                    champion VARCHAR(255) NOT NULL,
                    runner_up VARCHAR(255) NOT NULL,
                    semi_finalist_1 VARCHAR(255) NOT NULL,
                    semi_finalist_2 VARCHAR(255) NOT NULL,
                    quarter_finalist_1 VARCHAR(255) NOT NULL,
                    quarter_finalist_2 VARCHAR(255) NOT NULL,
                    quarter_finalist_3 VARCHAR(255) NOT NULL,
                    quarter_finalist_4 VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            print("✓ club_tournament_results table created")

            # Create indexes
            print("Creating indexes...")
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_club_tournaments_venue_id ON club_tournaments(venue_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_club_tournaments_datetime ON club_tournaments(tournament_datetime)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_club_venues_name ON club_venues(name)
            """))
            print("✓ Indexes created")

            print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())

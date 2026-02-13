"""
Migration script to add next_tournament_date column to fund_settings table.

This script adds a new column to store the next scheduled tournament date,
which can be set by admins and defaults to null.

Run this script once to update your database schema.
"""

import asyncio
import sys
import os
import urllib.parse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Fix for Render/Heroku/Supabase which use postgres:// or postgresql:// 
# but SQLAlchemy needs postgresql+asyncpg://
if DATABASE_URL:
    try:
        # Handle auto-encoding of special characters in password (like @)
        if "://" in DATABASE_URL and "@" in DATABASE_URL:
            scheme_part, rest = DATABASE_URL.split("://", 1)
            # Find the LAST @, which separates userinfo from host
            if "@" in rest:
                userinfo, hostinfo = rest.rsplit("@", 1)
                # Split userinfo into user:password
                if ":" in userinfo:
                    user, password = userinfo.split(":", 1)
                    # If password contains unescaped @, encode it
                    if "@" in password:
                        password = urllib.parse.quote_plus(password)
                        DATABASE_URL = f"{scheme_part}://{user}:{password}@{hostinfo}"
                        print("✓ Automatically encoded special characters in DATABASE_URL password.")
    except Exception as e:
        print(f"⚠ Warning: Failed to process DATABASE_URL encoding: {e}")

    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def add_next_tournament_date_column():
    """Add next_tournament_date column to fund_settings table."""
    
    if not DATABASE_URL:
        print("❌ Error: DATABASE_URL is not set.")
        return

    print("Starting migration: Adding next_tournament_date column to fund_settings...")
    
    # Create a local engine for the migration to ensure correct URL handling
    engine = create_async_engine(DATABASE_URL)
    
    try:
        async with engine.begin() as conn:
            # Check if column already exists
            check_query = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='fund_settings' AND column_name='next_tournament_date';
            """
            
            result = await conn.execute(text(check_query))
            exists = result.fetchone()
            
            if exists:
                print("✓ Column 'next_tournament_date' already exists. Skipping migration.")
                return
            
            # Add the column
            alter_query = """
            ALTER TABLE fund_settings 
            ADD COLUMN next_tournament_date DATE;
            """
            
            await conn.execute(text(alter_query))
            print("✓ Successfully added 'next_tournament_date' column to fund_settings table.")
    finally:
        await engine.dispose()
    
    print("Migration completed successfully!")

async def main():
    try:
        await add_next_tournament_date_column()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

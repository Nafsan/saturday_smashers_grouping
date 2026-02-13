"""
Migration script to add next_tournament_date column to fund_settings table.

This script adds a new column to store the next scheduled tournament date,
which can be set by admins and defaults to null.

Run this script once to update your database schema.
"""

import asyncio
import sys
from sqlalchemy import text
from database import engine
from urllib.parse import quote_plus
import os
from dotenv import load_dotenv

load_dotenv()

async def add_next_tournament_date_column():
    """Add next_tournament_date column to fund_settings table."""
    
    print("Starting migration: Adding next_tournament_date column to fund_settings...")
    
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
    
    print("Migration completed successfully!")

async def main():
    try:
        await add_next_tournament_date_column()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())

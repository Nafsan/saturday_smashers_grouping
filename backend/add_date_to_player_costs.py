import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Fix for Render/Heroku which use postgres:// or postgresql:// but SQLAlchemy needs postgresql+asyncpg://
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def add_date_column():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Checking if 'date' column exists in 'player_specific_costs'...")
        try:
            # Check if column exists
            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='player_specific_costs' AND column_name='cost_date'"
            ))
            exists = result.scalar()
            
            if not exists:
                print("Adding 'cost_date' column...")
                await conn.execute(text("ALTER TABLE player_specific_costs ADD COLUMN cost_date DATE NULL"))
                print("'cost_date' column added successfully.")
            else:
                print("'cost_date' column already exists.")

            # make tournament_cost_id nullable
            try:
                print("Checking 'tournament_cost_id' constraint...")
                # There isn't a simple SQL standard way to check for nullability constraint in a cross-compatible way easily in one line without inspecting information_schema extensively
                # But since we want to ensure it is nullable, we can just try to alter it.
                # If it's already nullable, this operation is usually safe or idempotent depending on the DB, 
                # but to be safe and clear we will just run the ALTER.
                # For PostgreSQL specifically:
                print("Altering 'tournament_cost_id' to be nullable...")
                await conn.execute(text("ALTER TABLE player_specific_costs ALTER COLUMN tournament_cost_id DROP NOT NULL"))
                print("'tournament_cost_id' is now nullable.")
            except Exception as e:
                print(f"Error altering tournament_cost_id: {e}")

        except Exception as e:
            print(f"An error occurred: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_date_column())

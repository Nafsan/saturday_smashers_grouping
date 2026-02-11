import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

import urllib.parse

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Fix for Render/Heroku which use postgres:// or postgresql:// but SQLAlchemy needs postgresql+asyncpg://
if DATABASE_URL:
    # Handle auto-encoding of special characters in password (like @)
    try:
        # Check if URL seems malformed (socket error usually means host parsing failed due to extra @)
        # We assume the last @ separates the host
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
                        print("Automatically encoded special characters in DATABASE_URL password.")
    except Exception as e:
        print(f"Warning: Failed to process DATABASE_URL encoding: {e}")

    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def run_migration():
    if not DATABASE_URL:
        print("Error: DATABASE_URL is not set.")
        return

    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Starting migration...")
        
        # 1. Add cost_date column if it doesn't exist
        try:
            print("Checking 'cost_date' column in 'player_specific_costs'...")
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
        except Exception as e:
            print(f"Error handling 'cost_date' column: {e}")

        # 2. Make tournament_cost_id nullable
        try:
            print("Ensuring 'tournament_cost_id' is nullable...")
            # We blindly execute the ALTER to DROP NOT NULL. It's safe if already nullable.
            await conn.execute(text("ALTER TABLE player_specific_costs ALTER COLUMN tournament_cost_id DROP NOT NULL"))
            print("'tournament_cost_id' is now nullable.")
        except Exception as e:
            print(f"Error altering 'tournament_cost_id': {e}")

    await engine.dispose()
    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(run_migration())

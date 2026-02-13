import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Try to load from current dir first
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Testing connection to: {DATABASE_URL}")

async def test_conn():
    try:
        engine = create_async_engine(DATABASE_URL)
        async with engine.connect() as conn:
            print("Successfully connected!")
            result = await conn.execute(text("SELECT 1"))
            print(f"Result: {result.scalar()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if DATABASE_URL:
        asyncio.run(test_conn())
    else:
        print("DATABASE_URL not found!")

import asyncio
from sqlalchemy import text
from database import engine

async def migrate():
    print("Connecting to database...")
    async with engine.begin() as conn:
        print("Checking for 'online_link' column in 'club_tournaments' table...")
        # Check if the column exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='club_tournaments' AND column_name='online_link';
        """))
        column_exists = result.scalar() is not None
        
        if not column_exists:
            print("Adding 'online_link' column to 'club_tournaments' table...")
            await conn.execute(text("ALTER TABLE club_tournaments ADD COLUMN online_link VARCHAR(500);"))
            print("Column 'online_link' added successfully.")
        else:
            print("Column 'online_link' already exists.")

if __name__ == "__main__":
    asyncio.run(migrate())

import asyncio
from sqlalchemy import text
from database import engine

async def migrate():
    print("Connecting to database...")
    async with engine.begin() as conn:
        print("Creating 'club_venue_whatsapp_links' table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS club_venue_whatsapp_links (
                id SERIAL PRIMARY KEY,
                venue_id INTEGER NOT NULL REFERENCES club_venues(id) ON DELETE CASCADE,
                label VARCHAR(255) NOT NULL,
                link VARCHAR(500) NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        print("Table 'club_venue_whatsapp_links' created/verified.")

        print("Checking for 'whatsapp_link_id' column in 'club_tournaments' table...")
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='club_tournaments' AND column_name='whatsapp_link_id';
        """))
        column_exists = result.scalar() is not None
        
        if not column_exists:
            print("Adding 'whatsapp_link_id' column to 'club_tournaments' table...")
            await conn.execute(text("""
                ALTER TABLE club_tournaments 
                ADD COLUMN whatsapp_link_id INTEGER REFERENCES club_venue_whatsapp_links(id) ON DELETE SET NULL;
            """))
            print("Column 'whatsapp_link_id' added successfully.")
        else:
            print("Column 'whatsapp_link_id' already exists.")

if __name__ == "__main__":
    asyncio.run(migrate())

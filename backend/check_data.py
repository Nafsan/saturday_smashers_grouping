import asyncio
from sqlalchemy.future import select
from sqlalchemy import func
from database import get_db, engine
from models import Tournament, Player

async def check_data():
    async with engine.connect() as conn:
        pass # Just to init engine

    async for db in get_db():
        t_count = await db.execute(select(func.count(Tournament.id)))
        p_count = await db.execute(select(func.count(Player.id)))
        
        print(f"Tournaments: {t_count.scalar()}")
        print(f"Players: {p_count.scalar()}")
        break

if __name__ == "__main__":
    asyncio.run(check_data())

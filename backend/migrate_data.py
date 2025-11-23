import json
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from models import Base, Tournament, RankGroup, Player
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not set")
    exit(1)

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def migrate():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Read JSON
        with open('../src/data/history.json', 'r') as f:
            data = json.load(f)

        print(f"Found {len(data)} tournaments to migrate...")

        for t_data in data:
            # Check existence
            existing = await db.execute(select(Tournament).where(Tournament.id == t_data['id']))
            if existing.scalar():
                print(f"Tournament {t_data['id']} already exists. Skipping.")
                continue

            print(f"Migrating {t_data['id']}...")
            
            # Create Tournament
            from datetime import datetime
            date_obj = datetime.strptime(t_data['date'], '%Y-%m-%d').date()
            tournament = Tournament(id=t_data['id'], date=date_obj)
            db.add(tournament)

            # Process Ranks
            # Sort ranks to ensure correct rating calculation if missing
            ranks = sorted(t_data['ranks'], key=lambda x: x['rank'])
            
            for index, r_data in enumerate(ranks):
                # Calculate rating if missing (1-based index)
                rating = r_data.get('rating', index + 1)
                
                rank_group = RankGroup(
                    rank=r_data['rank'],
                    rating=rating,
                    tournament=tournament
                )
                
                # Process Players
                for p_name in r_data['players']:
                    # Find or Create Player
                    result = await db.execute(select(Player).where(Player.name == p_name))
                    player = result.scalar()
                    
                    if not player:
                        player = Player(name=p_name)
                        db.add(player)
                        await db.flush() # Get ID
                    
                    rank_group.players.append(player)
                
                db.add(rank_group)
        
        await db.commit()
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())

from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import models, schemas
from database import engine, get_db, Base
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/history", response_model=List[schemas.Tournament])
async def get_history(db: AsyncSession = Depends(get_db)):
    # Fetch all tournaments with related data
    result = await db.execute(
        select(models.Tournament)
        .options(
            selectinload(models.Tournament.rank_groups)
            .selectinload(models.RankGroup.players)
        )
        .order_by(models.Tournament.date.desc())
    )
    tournaments = result.scalars().all()
    
    # Transform to match schema (RankGroup.players needs to be list of strings)
    # Pydantic's orm_mode might struggle with the M2M relationship directly mapping to List[str]
    # We might need a custom response model or manual transformation.
    # Let's do manual transformation for simplicity and robustness.
    
    response = []
    for t in tournaments:
        ranks = []
        for rg in t.rank_groups:
            ranks.append({
                "id": rg.id,
                "tournament_id": rg.tournament_id,
                "rank": rg.rank,
                "rating": rg.rating,
                "players": [p.name for p in rg.players]
            })
        response.append({
            "id": t.id,
            "date": t.date,
            "ranks": ranks
        })
        
    return response

@app.post("/history", status_code=status.HTTP_201_CREATED)
async def add_tournament(
    tournament: schemas.TournamentCreate, 
    password: str,
    db: AsyncSession = Depends(get_db)
):
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")

    # Check if exists
    existing = await db.execute(select(models.Tournament).where(models.Tournament.id == tournament.id))
    if existing.scalar():
        raise HTTPException(status_code=400, detail="Tournament ID already exists")

    # Create Tournament
    db_tournament = models.Tournament(id=tournament.id, date=tournament.date)
    db.add(db_tournament)
    
    for rg in tournament.ranks:
        db_rg = models.RankGroup(rank=rg.rank, rating=rg.rating, tournament_id=tournament.id)
        
        # Handle Players
        for player_name in rg.players:
            # Check if player exists
            result = await db.execute(select(models.Player).where(models.Player.name == player_name))
            player = result.scalar()
            
            if not player:
                player = models.Player(name=player_name)
                db.add(player)
                await db.flush() # Get ID
            
            db_rg.players.append(player)
            
        db.add(db_rg)

    await db.commit()
    return {"message": "Tournament added successfully"}

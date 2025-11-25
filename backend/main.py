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
            "playlist_url": t.playlist_url,
            "embed_url": t.embed_url,
            "ranks": ranks
        })
        
    return response

def validate_tournament_rules(tournament: schemas.TournamentCreate):
    all_players = []
    ranks_present = {}

    for rg in tournament.ranks:
        ranks_present[rg.rank] = len(rg.players)
        all_players.extend(rg.players)

        # Max players validation
        if rg.rank in [3, 11] and len(rg.players) != 2:
            raise HTTPException(status_code=400, detail=f"Rank {rg.rank} (Semi-Finals) must have exactly 2 players.")
        if rg.rank in [5, 13] and len(rg.players) > 4:
            raise HTTPException(status_code=400, detail=f"Rank {rg.rank} (Quarter-Finals) cannot have more than 4 players.")

    # Unique players validation
    if len(all_players) != len(set(all_players)):
        raise HTTPException(status_code=400, detail="A player cannot be present multiple times in the same tournament.")

    # Mandatory ranks validation
    # Cup: 1 (Champ), 2 (Runner), 3 (Semis)
    # Plate: 9 (Champ), 10 (Runner), 11 (Semis)
    mandatory_ranks = {
        1: "Cup Champion",
        2: "Cup Runner Up",
        3: "Cup Semi Finalists",
        9: "Plate Champion",
        10: "Plate Runner Up",
        11: "Plate Semi Finalists"
    }

    for rank, name in mandatory_ranks.items():
        if rank not in ranks_present or ranks_present[rank] == 0:
            raise HTTPException(status_code=400, detail=f"{name} is mandatory.")

@app.post("/history", status_code=status.HTTP_201_CREATED)
async def add_tournament(
    tournament: schemas.TournamentCreate, 
    password: str,
    db: AsyncSession = Depends(get_db)
):
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")

    validate_tournament_rules(tournament)

    # Check if exists
    existing = await db.execute(select(models.Tournament).where(models.Tournament.id == tournament.id))
    if existing.scalar():
        raise HTTPException(status_code=400, detail="Tournament ID already exists")

    # Create Tournament
    db_tournament = models.Tournament(
        id=tournament.id, 
        date=tournament.date,
        playlist_url=tournament.playlist_url,
        embed_url=tournament.embed_url
    )
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
@app.put("/history/{tournament_id}")
async def update_tournament(
    tournament_id: str,
    tournament: schemas.TournamentCreate,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")

    validate_tournament_rules(tournament)

    # Check if exists
    result = await db.execute(select(models.Tournament).where(models.Tournament.id == tournament_id))
    db_tournament = result.scalar()
    
    if not db_tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Update Date and URLs
    db_tournament.date = tournament.date
    db_tournament.playlist_url = tournament.playlist_url
    db_tournament.embed_url = tournament.embed_url
    
    # Delete existing rank groups (cascade should handle associations if configured, but let's be explicit)
    # Actually, we need to delete RankGroups associated with this tournament.
    # The association table rank_group_players will be cleaned up if we delete RankGroup.
    
    # Fetch existing rank groups to delete them
    result = await db.execute(select(models.RankGroup).where(models.RankGroup.tournament_id == tournament_id))
    existing_rgs = result.scalars().all()
    
    for rg in existing_rgs:
        await db.delete(rg)
        
    # Re-create Ranks
    for rg in tournament.ranks:
        db_rg = models.RankGroup(rank=rg.rank, rating=rg.rating, tournament_id=tournament_id)
        
        for player_name in rg.players:
            # Find or Create Player
            result = await db.execute(select(models.Player).where(models.Player.name == player_name))
            player = result.scalar()
            
            if not player:
                player = models.Player(name=player_name)
                db.add(player)
                await db.flush()
            
            db_rg.players.append(player)
            
        db.add(db_rg)

    await db.commit()
    return {"message": "Tournament updated successfully"}

@app.delete("/history/{tournament_id}")
async def delete_tournament(
    tournament_id: str,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    if password != "ss_admin_panel":
        raise HTTPException(status_code=403, detail="Invalid password")

    # Check if exists
    result = await db.execute(select(models.Tournament).where(models.Tournament.id == tournament_id))
    db_tournament = result.scalar()
    
    if not db_tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Delete RankGroups associated with this tournament
    # (Explicitly deleting them, though cascade might handle it depending on DB setup)
    result = await db.execute(select(models.RankGroup).where(models.RankGroup.tournament_id == tournament_id))
    existing_rgs = result.scalars().all()
    
    for rg in existing_rgs:
        await db.delete(rg)

    # Delete the tournament itself
    await db.delete(db_tournament)
    
    await db.commit()
    return {"message": "Tournament deleted successfully"}

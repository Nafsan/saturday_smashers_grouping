from fastapi import FastAPI
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from tournament.api import router as tournament_router
from player.api import router as player_router
from fund.api import router as fund_router
from datetime import datetime
from sqlalchemy import text
import time

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

# Health check endpoints
@app.get("/health")
async def health_check():
    """Simple health check endpoint for keep-alive pings"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health/db")
async def database_health_check():
    """Database health check endpoint to verify Supabase connectivity"""
    try:
        start_time = time.time()
        
        # Test database connection with a simple query
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        
        response_time_ms = round((time.time() - start_time) * 1000, 2)
        
        return {
            "status": "healthy",
            "database": "connected",
            "response_time_ms": response_time_ms,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# Include routers
app.include_router(tournament_router)
app.include_router(player_router)
app.include_router(fund_router)

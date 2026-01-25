from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from tournament.api import router as tournament_router
from player.api import router as player_router
from fund.api import router as fund_router
from news.api import router as news_router
from datetime import datetime

from sqlalchemy import text
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
@app.head("/health")
async def health_check():
    """Simple health check endpoint for keep-alive pings (supports GET and HEAD)"""
    timestamp = datetime.utcnow().isoformat()
    logger.info(f"Health check endpoint called at {timestamp}")
    
    return {
        "status": "healthy",
        "timestamp": timestamp
    }

@app.get("/health/db")
@app.head("/health/db")
async def database_health_check():
    """Database health check endpoint to verify Supabase connectivity (supports GET and HEAD)"""
    timestamp = datetime.utcnow().isoformat()
    logger.info(f"Database health check endpoint called at {timestamp}")
    
    try:
        start_time = time.time()
        
        # Test database connection with a simple query
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        
        response_time_ms = round((time.time() - start_time) * 1000, 2)
        
        logger.info(f"Database health check successful - Response time: {response_time_ms}ms")
        
        return {
            "status": "healthy",
            "database": "connected",
            "response_time_ms": response_time_ms,
            "timestamp": timestamp
        }
    except Exception as e:
        logger.error(f"Database health check failed - Error: {str(e)}", exc_info=True)
        
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": timestamp
        }

# Include routers
app.include_router(tournament_router)
app.include_router(player_router)
app.include_router(fund_router)
app.include_router(news_router)

# Mount uploads directory
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory="uploads"), name="uploads")

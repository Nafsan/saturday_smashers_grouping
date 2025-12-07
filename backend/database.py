from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback or error if not set. For now, let's just print a warning.
    print("WARNING: DATABASE_URL not set in .env")
    DATABASE_URL = "postgresql+asyncpg://user:password@localhost/dbname"

# Fix for Render/Heroku which use postgres:// or postgresql:// but SQLAlchemy needs postgresql+asyncpg://
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Enable SQL logging only in development (when DEBUG=True)
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Connection pool configuration for Supabase Transaction Pooler
# Supabase uses pgbouncer in transaction mode, which doesn't support prepared statements
engine = create_async_engine(
    DATABASE_URL, 
    echo=DEBUG,
    pool_size=5,          # Maximum number of permanent connections
    max_overflow=10,      # Maximum number of temporary connections beyond pool_size
    pool_pre_ping=True,   # Verify connections before using them
    pool_recycle=3600,    # Recycle connections after 1 hour
    connect_args={
        "statement_cache_size": 0,  # Disable prepared statements for pgbouncer compatibility
        "prepared_statement_cache_size": 0  # Also disable for newer asyncpg versions
    }
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

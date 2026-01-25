from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from database import get_db
from news import models, schemas

router = APIRouter(
    prefix="/news",
    tags=["news"],
    responses={404: {"description": "Not found"}},
)

import shutil
import uuid
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Create unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = f"uploads/{unique_filename}"
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return URL (assuming standard setup)
        return {"url": f"/static/uploads/{unique_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not upload file: {str(e)}")

@router.post("/", response_model=schemas.Achievement)
async def create_achievement(achievement: schemas.AchievementCreate, db: AsyncSession = Depends(get_db)):
    db_achievement = models.Achievement(**achievement.dict())
    db.add(db_achievement)
    await db.commit()
    await db.refresh(db_achievement)
    return db_achievement

@router.get("/", response_model=List[schemas.Achievement])
async def read_achievements(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Achievement).order_by(models.Achievement.date.desc()).offset(skip).limit(limit))
    return result.scalars().all()

@router.put("/{achievement_id}", response_model=schemas.Achievement)
async def update_achievement(achievement_id: int, achievement: schemas.AchievementCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Achievement).filter(models.Achievement.id == achievement_id))
    db_achievement = result.scalars().first()
    if db_achievement is None:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    for key, value in achievement.dict().items():
        setattr(db_achievement, key, value)
    
    await db.commit()
    await db.refresh(db_achievement)
    return db_achievement

@router.delete("/{achievement_id}")
async def delete_achievement(achievement_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Achievement).filter(models.Achievement.id == achievement_id))
    achievement = result.scalars().first()
    if achievement is None:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    await db.delete(achievement)
    await db.commit()
    return {"ok": True}

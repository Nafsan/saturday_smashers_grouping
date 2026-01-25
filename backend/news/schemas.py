from typing import List
from pydantic import BaseModel, validator
from datetime import date

class AchievementBase(BaseModel):
    title: str
    description: str
    date: date
    image_urls: List[str] = []

    @validator('description')
    def validate_description_length(cls, v):
        word_count = len(v.split())
        if word_count > 100:
            raise ValueError('Description must be 100 words or less')
        return v

class AchievementCreate(AchievementBase):
    pass

class Achievement(AchievementBase):
    id: int

    class Config:
        orm_mode = True

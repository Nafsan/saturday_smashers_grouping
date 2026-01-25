from sqlalchemy import Column, Integer, String, Text, Date, JSON
from database import Base

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    date = Column(Date, nullable=False)
    image_urls = Column(JSON, default=list, nullable=False)

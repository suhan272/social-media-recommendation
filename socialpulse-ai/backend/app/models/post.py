from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Float
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    platform_post_id = Column(String, index=True) # e.g. Instagram Media ID
    caption = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    media_type = Column(String) # IMAGE, VIDEO, CAROUSEL_ALBUM
    
    # Metrics
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    
    # Additional AI metadata can be stored here
    ai_analysis = Column(JSON, nullable=True)

    posted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    account = relationship("Account", back_populates="posts")

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    platform = Column(String, default="instagram")
    platform_account_id = Column(String, index=True) # e.g. Instagram Professional Account ID
    access_token = Column(String)
    username = Column(String)
    followers_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="accounts")
    posts = relationship("Post", back_populates="account")

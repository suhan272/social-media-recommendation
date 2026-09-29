import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    HINDSIGHT_API_KEY: str = ""
    HINDSIGHT_BASE_URL: str = "https://api.hindsight.com/v1" # example
    
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    META_REDIRECT_URI: str = "http://localhost:8000/api/auth/instagram/callback"
    
    DATABASE_URL: str = "sqlite:///./socialpulse.db"
    
    class Config:
        env_file = ".env"

settings = Settings()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, accounts, analytics, agent
from app.database import engine, Base
import app.models # Imports models to register with Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SocialPulse AI Backend")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])

@app.get("/")
def read_root():
    return {"message": "Welcome to SocialPulse AI API"}

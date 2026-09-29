from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.account import Account
from app.models.post import Post
from app.services.instagram import InstagramClient
from datetime import datetime

router = APIRouter()

class ConnectAccountRequest(BaseModel):
    username: str
    password: str
    platform: str = "instagram"

@router.get("/")
def get_accounts(db: Session = Depends(get_db)):
    accounts = db.query(Account).all()
    return {"accounts": accounts}

@router.post("/connect")
async def connect_account(req: ConnectAccountRequest, db: Session = Depends(get_db)):
    # 1. Fetch info from Instagram using Instagrapi
    try:
        client = InstagramClient(username=req.username, password=req.password)
        info = await client.get_account_info()
        posts_data = await client.get_recent_posts(limit=20)
        account_id_to_use = str(client.user_id)
        access_token_to_use = "instagrapi_session"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect: {str(e)}")

    # 2. Save or update account
    account = db.query(Account).filter_by(platform_account_id=account_id_to_use).first()
    if not account:
        account = Account(
            platform=req.platform,
            platform_account_id=account_id_to_use,
            access_token=access_token_to_use,
            username=info.get("username"),
            followers_count=info.get("followers_count", 0),
            # hardcode user_id=1 for now since we have no auth
            user_id=1 
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    else:
        account.access_token = access_token_to_use
        account.username = info.get("username")
        account.followers_count = info.get("followers_count", 0)
        db.commit()

    # 3. Save posts
    for p in posts_data:
        existing_post = db.query(Post).filter_by(platform_post_id=p["id"]).first()
        if not existing_post:
            new_post = Post(
                account_id=account.id,
                platform_post_id=p["id"],
                caption=p.get("caption"),
                media_url=p.get("media_url"),
                media_type=p.get("media_type"),
                likes=p.get("like_count", 0),
                comments=p.get("comments_count", 0),
                posted_at=datetime.fromisoformat(p["timestamp"].replace('+0000', '+00:00')) if p.get("timestamp") else datetime.utcnow()
            )
            db.add(new_post)
        else:
            existing_post.likes = p.get("like_count", 0)
            existing_post.comments = p.get("comments_count", 0)
    
    db.commit()

    return {"status": "success", "account": account}

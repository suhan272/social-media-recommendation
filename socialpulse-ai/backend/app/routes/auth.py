from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.account import Account
from app.models.post import Post
from app.services.instagram import InstagramClient
from datetime import datetime

router = APIRouter()

@router.get("/")
def get_auth_status():
    return {"status": "authenticated", "user": "User"}

@router.get("/instagram/login")
def instagram_login():
    """Redirect user to Meta/Facebook OAuth page."""
    client = InstagramClient()
    url = client.get_authorization_url()
    return RedirectResponse(url)

@router.get("/instagram/callback")
async def instagram_callback(code: str = Query(None), error: str = Query(None), error_description: str = Query(None), db: Session = Depends(get_db)):
    """Handle callback from Meta OAuth, complete flow and save data."""
    if error:
        return RedirectResponse(url=f"http://localhost:5173/dashboard?error={error_description}")
        
    if not code:
        return RedirectResponse(url=f"http://localhost:5173/dashboard?error=Authorization code is missing")
        
    client = InstagramClient()
    try:
        # 1. Exchange code for short-lived token
        await client.exchange_code_for_token(code)
        
        # 2. Exchange for long-lived token (optional but recommended)
        await client.get_long_lived_token()
        
        # 3. Get connected Instagram account ID
        account_id = await client.get_connected_instagram_account_id()
        
        # 4. Fetch info and recent posts
        info = await client.get_account_info(account_id)
        posts_data = await client.get_recent_posts(account_id, limit=20)
        
    except Exception as e:
        return RedirectResponse(url=f"http://localhost:5173/dashboard?error=Failed to connect Instagram account: {str(e)}")

    # Save or update account
    account = db.query(Account).filter_by(platform_account_id=account_id).first()
    if not account:
        account = Account(
            platform="instagram",
            platform_account_id=account_id,
            access_token=client.access_token,
            username=info.get("username"),
            user_id=1 # hardcode user_id=1 for now
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    else:
        account.access_token = client.access_token
        account.username = info.get("username")
        db.commit()

    # Save posts
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

    # Redirect to frontend dashboard with success flag
    return RedirectResponse(url=f"http://localhost:5173/dashboard?connected=true")

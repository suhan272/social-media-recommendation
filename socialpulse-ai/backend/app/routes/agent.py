from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.account import Account
from app.models.post import Post
from app.config import settings
from app.hindsight.client import hindsight_client

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str
    account_id: str = None

@router.get("/")
def get_agent_status():
    return {"status": "ready"}

@router.post("/chat")
async def chat_with_agent(req: ChatRequest, db: Session = Depends(get_db)):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")

    context = ""
    # 1. Recall memory from Hindsight if account_id is provided
    if req.account_id:
        memories = await hindsight_client.recall(req.account_id, req.prompt, limit=3)
        if memories:
            context += "Context from previous interactions:\n" + "\n".join([m.get("content", "") for m in memories]) + "\n\n"

    # Fetch basic analytics from DB to provide to the AI
    account = db.query(Account).first()
    if account:
        posts = db.query(Post).filter(Post.account_id == account.id).order_by(Post.posted_at.desc()).all()
        total_posts = len(posts)
        if total_posts > 0:
            total_likes = sum(p.likes for p in posts)
            total_comments = sum(p.comments for p in posts)
            video_count = sum(1 for p in posts if p.media_type == "VIDEO")
            image_count = sum(1 for p in posts if p.media_type == "IMAGE")
            
            context += f"Account Analytics Context:\n- Total Posts: {total_posts}\n- Total Likes: {total_likes}\n- Total Comments: {total_comments}\n- Video Posts: {video_count}\n- Image Posts: {image_count}\n"
            
            top_post = max(posts, key=lambda x: x.likes + x.comments)
            context += f"- Top Performing Post: {top_post.caption[:50]}... (Likes: {top_post.likes}, Comments: {top_post.comments})\n\n"

    # 2. Call Groq
    groq_url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    system_prompt = "You are an expert AI social media manager and strategist. Use the provided context to give personalized advice. Your primary role includes predicting and suggesting the best type of content (e.g., reels, images, carousels) to post, the optimal times to post for maximum engagement, and providing a tailored list of effective hashtags based on the account's past performance."
    payload = {
        "model": "openai/gpt-oss-20b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context + "User query: " + req.prompt}
        ]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(groq_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            reply = data["choices"][0]["message"]["content"]
            
            # 3. Retain the interaction in Hindsight
            if req.account_id:
                await hindsight_client.retain(req.account_id, f"User asked: {req.prompt}. AI replied: {reply[:200]}...")
                
            return {"reply": reply}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")

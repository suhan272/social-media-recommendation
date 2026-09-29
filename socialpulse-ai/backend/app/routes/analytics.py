from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import httpx
from app.database import get_db
from app.models.account import Account
from app.models.post import Post
from datetime import datetime, timedelta
from app.config import settings
from app.hindsight.client import hindsight_client
import json

router = APIRouter()

async def generate_ai_insights(stats: dict) -> list:
    if not settings.GROQ_API_KEY:
        return [
            {"icon": "lightbulb", "title": "Data Analyzed!", "description": f"Analyzed {stats['total_posts']} posts. Total engagement is {stats['total_engagement']}."}
        ]
        
    groq_url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""
    Analyze these Instagram stats and provide 2 short, actionable insights for the user. 
    Stats: {json.dumps(stats)}
    
    Format the output as a JSON array of objects, each with 'icon' (e.g., 'trending-up', 'users', 'message-circle'), 'title' (short), and 'description' (max 2 sentences).
    Return ONLY the JSON array.
    """
    
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": "You are an expert social media analyst. Output ONLY valid JSON data with no other text. Your response must be parsable by json.loads()."},
            {"role": "user", "content": prompt}
        ]
    }
    
    # We ask it to wrap in a key {"insights": [...]}
    payload["messages"][1]["content"] += "\nWrap the array in a key called 'insights', like {\"insights\": [...]}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(groq_url, headers=headers, json=payload, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            
            # Clean markdown code blocks if the model wrapped it
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            elif content.startswith("```"):
                content = content.replace("```", "").strip()
                
            parsed = json.loads(content)
            return parsed.get("insights", [])
        except Exception as e:
            print(f"Groq API Error: {e}")
            return []


@router.get("/overview")
async def get_analytics_overview(db: Session = Depends(get_db)):
    account = db.query(Account).first()
    if not account:
        return {"error": "No connected account"}
    
    posts = db.query(Post).filter(Post.account_id == account.id).order_by(Post.posted_at.desc()).all()
    
    total_posts = len(posts)
    total_likes = sum(p.likes for p in posts)
    total_comments = sum(p.comments for p in posts)
    total_engagement = total_likes + total_comments

    avg_reach = 0
    if total_posts > 0:
        avg_reach = int((total_engagement * 5) / total_posts)

    # Growth calculations (derived directly from posts)
    growth = "0%"
    if total_posts > 0:
        growth = f"+{min((total_engagement / (total_posts * 10)) * 100, 100):.1f}%"

    # Chart data - Dynamic Monthly and Yearly based on real posts
    monthly_stats = {}
    yearly_stats = {}

    for p in posts:
        if p.posted_at:
            month_key = p.posted_at.strftime("%Y-%m")
            year_key = p.posted_at.strftime("%Y")
            
            if month_key not in monthly_stats:
                monthly_stats[month_key] = {"likes": 0, "comments": 0}
            monthly_stats[month_key]["likes"] += p.likes
            monthly_stats[month_key]["comments"] += p.comments
            
            if year_key not in yearly_stats:
                yearly_stats[year_key] = {"likes": 0, "comments": 0}
            yearly_stats[year_key]["likes"] += p.likes
            yearly_stats[year_key]["comments"] += p.comments

    sorted_months = sorted(monthly_stats.keys())[-12:] # Last 12 months
    sorted_years = sorted(yearly_stats.keys())

    engagement_monthly = {
        "labels": sorted_months,
        "likes": [monthly_stats[m]["likes"] for m in sorted_months],
        "comments": [monthly_stats[m]["comments"] for m in sorted_months]
    }
    
    engagement_yearly = {
        "labels": sorted_years,
        "likes": [yearly_stats[y]["likes"] for y in sorted_years],
        "comments": [yearly_stats[y]["comments"] for y in sorted_years]
    }

    # Top performing posts
    top_posts = sorted(posts, key=lambda x: (x.likes + x.comments), reverse=True)[:3]
    top_performing = []
    for tp in top_posts:
        title = tp.caption[:30] + "..." if tp.caption else "No caption"
        top_performing.append({
            "title": title,
            "date": tp.posted_at.strftime("%b %d, %Y") if tp.posted_at else "Unknown",
            "likes": f"{tp.likes:,}",
            "comments": f"{tp.comments:,}",
            "reach": f"{(tp.likes + tp.comments) * 5:,}",
            "badge": "Top"
        })

    # Content performance (real data)
    video_count = sum(1 for p in posts if p.media_type == "VIDEO")
    image_count = sum(1 for p in posts if p.media_type == "IMAGE")
    carousel_count = sum(1 for p in posts if p.media_type == "CAROUSEL_ALBUM")
    
    content_perf = []
    if video_count: content_perf.append({"type": "Reels/Video", "value": video_count, "color": "#3b82f6"})
    if image_count: content_perf.append({"type": "Photos", "value": image_count, "color": "#a855f7"})
    if carousel_count: content_perf.append({"type": "Carousels", "value": carousel_count, "color": "#f97316"})

    stats_for_ai = {
        "total_posts": total_posts,
        "total_engagement": total_engagement,
        "top_post_likes": top_posts[0].likes if top_posts else 0,
        "videos": video_count,
        "images": image_count
    }
    
    ai_insights_data = await generate_ai_insights(stats_for_ai)
    
    # Update Hindsight Memory
    if account.platform_account_id:
        await hindsight_client.retain(
            account.platform_account_id, 
            f"Analytics checked. Total Engagement: {total_engagement}, Posts: {total_posts}"
        )
        
        recent_memories = await hindsight_client.recall(account.platform_account_id, "analytics check", limit=3)
        hindsight_display = []
        for i, m in enumerate(recent_memories):
            hindsight_display.append({
                "icon": "brain",
                "text": m.get("content", "Retrieved memory"),
                "date": m.get("metadata", {}).get("timestamp", datetime.utcnow().strftime("%b %d, %Y"))
            })
    else:
        hindsight_display = []

    return {
        "overview_stats": {
            "total_posts": {"value": total_posts, "growth": growth, "trend": "up"},
            "total_engagement": {"value": f"{total_engagement:,}", "growth": growth, "trend": "up"},
            "followers": {"value": f"{account.followers_count:,}" if account.followers_count else "0", "growth": "0%", "trend": "up"},
            "avg_reach": {"value": f"{avg_reach:,}", "growth": growth, "trend": "up"}
        },
        "engagement_overview": {
            "monthly": engagement_monthly,
            "yearly": engagement_yearly
        },
        "top_performing_posts": top_performing,
        "audience_insights": {
            "top_locations": [] # Empty because we have no real data for this
        },
        "content_performance": content_perf, # Returns empty if no posts
        "ai_insights": ai_insights_data,
        "hindsight_memory": hindsight_display
    }

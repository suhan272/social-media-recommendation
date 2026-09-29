from typing import Dict, Any, List
from instagrapi import Client

class InstagramClient:
    def __init__(self, username: str = None, password: str = None):
        self.client = Client()
        if username and password:
            self.client.login(username, password)
            self.user_id = self.client.user_id
        else:
            self.user_id = None

    async def get_account_info(self, account_id: str = None) -> Dict[str, Any]:
        """Fetch basic info for an Instagram account."""
        if not self.user_id:
            return {"username": "unknown"}
            
        info = self.client.user_info(self.user_id)
        return {
            "id": str(info.pk),
            "username": info.username,
            "profile_picture_url": str(info.profile_pic_url),
            "followers_count": info.follower_count,
            "follows_count": info.following_count,
            "media_count": info.media_count
        }

    async def get_recent_posts(self, account_id: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent posts and their metrics."""
        if not self.user_id:
            return []
            
        medias = self.client.user_medias(self.user_id, amount=limit)
        results = []
        for m in medias:
            results.append({
                "id": str(m.pk),
                "caption": m.caption_text,
                "media_type": "VIDEO" if m.media_type == 2 else "CAROUSEL_ALBUM" if m.media_type == 8 else "IMAGE",
                "media_url": str(m.thumbnail_url or m.video_url),
                "timestamp": m.taken_at.isoformat() if m.taken_at else None,
                "like_count": m.like_count,
                "comments_count": m.comment_count
            })
        return results

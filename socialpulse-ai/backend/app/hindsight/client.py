import httpx
from typing import Dict, Any, List
from app.config import settings

class HindsightClient:
    def __init__(self):
        self.api_key = settings.HINDSIGHT_API_KEY
        self.base_url = settings.HINDSIGHT_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def retain(self, account_id: str, observation: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Stores a new memory about the account."""
        if not self.api_key:
            # Fallback for demo mode if no key provided
            return {"status": "success", "demo": True, "observation": observation}
            
        async with httpx.AsyncClient(verify=False) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/memories",
                    headers=self.headers,
                    json={"namespace": account_id, "content": observation, "metadata": metadata or {}}
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Hindsight API Error: {e}")
                return {"error": str(e)}

    async def recall(self, account_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieves memories relevant to the query."""
        if not self.api_key:
            return [{"content": "Demo memory: AI content performs best.", "metadata": {}}]
            
        async with httpx.AsyncClient(verify=False) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/recall",
                    headers=self.headers,
                    json={"namespace": account_id, "query": query, "limit": limit}
                )
                response.raise_for_status()
                return response.json().get("memories", [])
            except Exception as e:
                print(f"Hindsight API Error: {e}")
                return []

hindsight_client = HindsightClient()

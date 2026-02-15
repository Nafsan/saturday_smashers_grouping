from fastapi import APIRouter, HTTPException
import httpx
from typing import Dict, Any

router = APIRouter(
    prefix="/ranking",
    tags=["ranking"]
)

import os
import json
import time
import hashlib
from typing import Dict, Any, Optional

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cache")
CACHE_EXPIRY = 7 * 24 * 60 * 60  # 7 days in seconds

if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR, exist_ok=True)

def get_cache_path(url: str):
    url_hash = hashlib.md5(url.encode()).hexdigest()
    return os.path.join(CACHE_DIR, f"{url_hash}.json")

@router.get("/proxy")
async def proxy_ranking(url: str, force_refresh: bool = False):
    """
    Proxies a request to BTTF website with 7-day caching
    """
    if not url.startswith("https://bttf.org.bd/"):
        raise HTTPException(status_code=400, detail="Invalid URL. Only bttf.org.bd allowed.")
    
    cache_path = get_cache_path(url)
    
    # Check cache
    if not force_refresh and os.path.exists(cache_path):
        with open(cache_path, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
            if time.time() - cache_data.get('timestamp', 0) < CACHE_EXPIRY:
                return {"html": cache_data['html'], "cached": True}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            html_content = response.text
            
            # Save to cache
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'timestamp': time.time(),
                    'html': html_content,
                    'url': url
                }, f)
                
            return {"html": html_content, "cached": False}
        except Exception as e:
            # If fetch fails but we have old cache, return it as fallback
            if os.path.exists(cache_path):
                with open(cache_path, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    return {"html": cache_data['html'], "cached": True, "error": str(e)}
            raise HTTPException(status_code=500, detail=f"Failed to fetch from BTTF: {str(e)}")

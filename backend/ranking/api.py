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
import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cache")
CACHE_EXPIRY = 365 * 24 * 60 * 60  # 1 year in seconds

if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR, exist_ok=True)

def get_cache_path(url: str):
    url_hash = hashlib.md5(url.encode()).hexdigest()
    return os.path.join(CACHE_DIR, f"{url_hash}.json")

@router.get("/youtube-search")
async def youtube_search(q: str):
    """
    Scrapes the YouTube channel search page and extracts metadata.
    Handles multi-word names by searching for each component.
    """
    channel_handle = "@saturday_smashers"
    words = [w.strip() for w in q.split() if len(w.strip()) > 1]
    # Always include the full query as the primary search
    search_queries = [q]
    for word in words:
        if word.lower() != q.lower() and word not in search_queries:
            search_queries.append(word)

    # Limit to avoid over-searching and potential blocking
    search_queries = search_queries[:4]

    async with httpx.AsyncClient() as client:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }

            async def perform_search(query):
                search_url = f"https://www.youtube.com/{channel_handle}/search?query={query}"
                try:
                    response = await client.get(search_url, headers=headers, timeout=15.0)
                    response.raise_for_status()
                    html = response.text
                    
                    # Find the ytInitialData JSON
                    start_marker = 'var ytInitialData = '
                    end_marker = ';</script>'
                    start_idx = html.find(start_marker)
                    if start_idx == -1: return []
                    
                    start_idx += len(start_marker)
                    end_idx = html.find(end_marker, start_idx)
                    if end_idx == -1: return []
                    
                    data = json.loads(html[start_idx:end_idx])
                    
                    found_videos = []
                    def extract_info(v):
                        return {
                            'videoId': v.get('videoId'),
                            'title': v.get('title', {}).get('runs', [{}])[0].get('text'),
                            'thumbnail': v.get('thumbnail', {}).get('thumbnails', [{}])[0].get('url'),
                            'viewCount': v.get('viewCountText', {}).get('simpleText') or v.get('shortViewCountText', {}).get('simpleText'),
                            'publishedTime': v.get('publishedTimeText', {}).get('simpleText'),
                            'length': v.get('lengthText', {}).get('simpleText')
                        }

                    try:
                        contents = data.get('contents', {}).get('twoColumnBrowseResultsRenderer', {}).get('tabs', [])
                        for tab in contents:
                            # Check expandableTabRenderer and tabRenderer as before
                            if 'expandableTabRenderer' in tab:
                                tab_content = tab['expandableTabRenderer'].get('content', {})
                                if 'sectionListRenderer' in tab_content:
                                    sections = tab_content['sectionListRenderer'].get('contents', [])
                                    for section in sections:
                                        if 'itemSectionRenderer' in section:
                                            items = section['itemSectionRenderer'].get('contents', [])
                                            for item in items:
                                                if 'videoRenderer' in item:
                                                    found_videos.append(extract_info(item['videoRenderer']))

                            if 'tabRenderer' in tab:
                                tab_content = tab['tabRenderer'].get('content', {})
                                if 'sectionListRenderer' in tab_content:
                                    sections = tab_content['sectionListRenderer'].get('contents', [])
                                    for section in sections:
                                        if 'itemSectionRenderer' in section:
                                            items = section['itemSectionRenderer'].get('contents', [])
                                            for item in items:
                                                if 'videoRenderer' in item:
                                                    found_videos.append(extract_info(item['videoRenderer']))
                                                elif 'shelfRenderer' in item:
                                                    shelf_items = item['shelfRenderer'].get('content', {}).get('horizontalListRenderer', {}).get('items', [])
                                                    for s_item in shelf_items:
                                                        if 'gridVideoRenderer' in s_item:
                                                            found_videos.append(extract_info(s_item['gridVideoRenderer']))
                    except Exception as e:
                        logger.error(f"Error parsing search results for {query}: {e}")
                    return found_videos
                except Exception as e:
                    logger.error(f"Search failed for {query}: {e}")
                    return []

            # Run all searches in parallel
            tasks = [perform_search(q) for q in search_queries]
            results_list = await asyncio.gather(*tasks)
            
            # Combine and de-duplicate
            all_videos = []
            seen_ids = set()
            for video_list in results_list:
                for vid in video_list:
                    if vid['videoId'] and vid['videoId'] not in seen_ids:
                        all_videos.append(vid)
                        seen_ids.add(vid['videoId'])

            return {"videos": all_videos}
        except Exception as e:
            logger.error(f"YouTube search error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to search YouTube: {str(e)}")

@router.get("/proxy")
async def proxy_ranking(url: str, force_refresh: bool = False):
    """
    Proxy a request to the BTTF website with 1-year caching.
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

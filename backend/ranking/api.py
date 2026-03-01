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
CACHE_EXPIRY = 365 * 24 * 60 * 60  # 1 year in seconds

if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR, exist_ok=True)

def get_cache_path(url: str):
    url_hash = hashlib.md5(url.encode()).hexdigest()
    return os.path.join(CACHE_DIR, f"{url_hash}.json")

@router.get("/youtube-search")
async def youtube_search(q: str):
    """
    Search for videos in the @saturday_smashers channel.
    Scrapes the YouTube channel search page and extracts metadata.
    """
    channel_handle = "@saturday_smashers"
    search_url = f"https://www.youtube.com/{channel_handle}/search?query={q}"
    
    async with httpx.AsyncClient() as client:
        try:
            # Set common headers to avoid being blocked and force English for consistent parsing
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
            response = await client.get(search_url, headers=headers, timeout=30.0)
            response.raise_for_status()
            html = response.text
            
            # Find the ytInitialData JSON in the page source
            start_marker = 'var ytInitialData = '
            end_marker = ';</script>'
            
            start_idx = html.find(start_marker)
            if start_idx == -1:
                return {"videos": [], "error": "ytInitialData not found"}
            
            start_idx += len(start_marker)
            end_idx = html.find(end_marker, start_idx)
            
            if end_idx == -1:
                return {"videos": [], "error": "Closing tag for ytInitialData not found"}
            
            json_str = html[start_idx:end_idx]
            data = json.loads(json_str)
            
            # Parse the complex nested structure of YouTube's internal data
            videos = []
            
            def extract_video_info(v):
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
                    # Case 1: Search results in expandableTabRenderer (common for specific channel search)
                    if 'expandableTabRenderer' in tab:
                        tab_content = tab['expandableTabRenderer'].get('content', {})
                        if 'sectionListRenderer' in tab_content:
                            sections = tab_content['sectionListRenderer'].get('contents', [])
                            for section in sections:
                                if 'itemSectionRenderer' in section:
                                    items = section['itemSectionRenderer'].get('contents', [])
                                    for item in items:
                                        if 'videoRenderer' in item:
                                            videos.append(extract_video_info(item['videoRenderer']))

                    # Case 2: Standard tabRenderer (Home, Videos, etc.)
                    if 'tabRenderer' in tab:
                        tab_content = tab['tabRenderer'].get('content', {})
                        if 'sectionListRenderer' in tab_content:
                            sections = tab_content['sectionListRenderer'].get('contents', [])
                            for section in sections:
                                if 'itemSectionRenderer' in section:
                                    items = section['itemSectionRenderer'].get('contents', [])
                                    for item in items:
                                        if 'videoRenderer' in item:
                                            videos.append(extract_video_info(item['videoRenderer']))
                                        elif 'shelfRenderer' in item:
                                            # Shelf content (horizontal list)
                                            shelf_items = item['shelfRenderer'].get('content', {}).get('horizontalListRenderer', {}).get('items', [])
                                            for s_item in shelf_items:
                                                if 'gridVideoRenderer' in s_item:
                                                    videos.append(extract_video_info(s_item['gridVideoRenderer']))
            except Exception as parse_err:
                logger.error(f"Error parsing ytInitialData: {str(parse_err)}")
                # Don't fail the whole request, return whatever we found
            
            # De-duplicate and filter out any partial items
            unique_videos = []
            seen_ids = set()
            for vid in videos:
                if vid['videoId'] and vid['videoId'] not in seen_ids:
                    unique_videos.append(vid)
                    seen_ids.add(vid['videoId'])

            return {"videos": unique_videos}
            
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

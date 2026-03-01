import httpx
import json
import logging
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_search(q):
    channel_handle = "@saturday_smashers"
    search_url = f"https://www.youtube.com/{channel_handle}/search?query={q}"
    
    async with httpx.AsyncClient() as client:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        }
        response = await client.get(search_url, headers=headers, timeout=30.0)
        html = response.text
        
        start_marker = 'var ytInitialData = '
        end_marker = ';</script>'
        
        start_idx = html.find(start_marker)
        if start_idx == -1:
            print("ytInitialData not found")
            return
        
        start_idx += len(start_marker)
        end_idx = html.find(end_marker, start_idx)
        
        json_str = html[start_idx:end_idx]
        data = json.loads(json_str)
        
        videos = []
        try:
            contents = data.get('contents', {}).get('twoColumnBrowseResultsRenderer', {}).get('tabs', [])
            print(f"Number of tabs: {len(contents)}")
            
            for i, tab in enumerate(contents):
                if 'expandableTabRenderer' in tab:
                    print(f"Tab {i} is expandableTabRenderer")
                    search_tab = tab['expandableTabRenderer']
                    content = search_tab.get('content', {})
                    if 'sectionListRenderer' in content:
                        print(f"  Found sectionListRenderer in expandableTabRenderer")
                        sections = content['sectionListRenderer'].get('contents', [])
                        for section in sections:
                            if 'itemSectionRenderer' in section:
                                results = section['itemSectionRenderer'].get('contents', [])
                                for result in results:
                                    if 'videoRenderer' in result:
                                        v = result['videoRenderer']
                                        video = {
                                            'videoId': v.get('videoId'),
                                            'title': v.get('title', {}).get('runs', [{}])[0].get('text'),
                                        }
                                        videos.append(video)
                                        print(f"Found Expandable Video: {video['title']}")

                if 'tabRenderer' in tab:
                    tab_renderer = tab['tabRenderer']
                    title = tab_renderer.get('title')
                    print(f"Tab {i}: {title}")
                    
                    content = tab_renderer.get('content', {})
                    if 'sectionListRenderer' in content:
                        print(f"  Found sectionListRenderer in Tab {i}")
                        sections = content['sectionListRenderer'].get('contents', [])
                        for section in sections:
                            if 'itemSectionRenderer' in section:
                                results = section['itemSectionRenderer'].get('contents', [])
                                for result in results:
                                    if 'videoRenderer' in result:
                                        v = result['videoRenderer']
                                        video = {
                                            'videoId': v.get('videoId'),
                                            'title': v.get('title', {}).get('runs', [{}])[0].get('text'),
                                        }
                                        videos.append(video)
                                        print(f"Found Video: {video['title']}")
                                    elif 'shelfRenderer' in result:
                                        print("  Found Shelf")
                                        shelf_contents = result['shelfRenderer'].get('content', {}).get('horizontalListRenderer', {}).get('items', [])
                                        for shelf_item in shelf_contents:
                                            if 'gridVideoRenderer' in shelf_item:
                                                v = shelf_item['gridVideoRenderer']
                                                video = {
                                                    'videoId': v.get('videoId'),
                                                    'title': v.get('title', {}).get('runs', [{}])[0].get('text'),
                                                }
                                                videos.append(video)
                                                print(f"Found Shelf Video: {video['title']}")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
        
        print(f"Total found: {len(videos)}")

if __name__ == "__main__":
    asyncio.run(test_search("Showmik"))

import httpx
import json
import asyncio
import xml.etree.ElementTree as ET

async def test_playlist(list_id):
    playlist_url = f"https://www.youtube.com/playlist?list={list_id}"
    
    async with httpx.AsyncClient() as client:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        }
        
        response = await client.get(playlist_url, headers=headers, timeout=15.0)
        response.raise_for_status()
        html = response.text
        
        videos = []
        start_marker = 'var ytInitialData = '
        end_marker = ';</script>'
        start_idx = html.find(start_marker)
        if start_idx != -1:
            start_idx += len(start_marker)
            end_idx = html.find(end_marker, start_idx)
            if end_idx != -1:
                try:
                    data = json.loads(html[start_idx:end_idx])
                    items = []
                    try:
                        contents = data.get('contents', {}).get('twoColumnBrowseResultsRenderer', {}).get('tabs', [{}])[0].get('tabRenderer', {}).get('content', {}).get('sectionListRenderer', {}).get('contents', [])
                        for sec in contents:
                            isr = sec.get('itemSectionRenderer', {}).get('contents', [])
                            for item in isr:
                                if 'playlistVideoListRenderer' in item:
                                    items.extend(item['playlistVideoListRenderer'].get('contents', []))
                                else:
                                    items.append(item)
                    except Exception as e:
                        print(f"Traversal warn: {e}")
                    
                    for item in items:
                        if 'playlistVideoRenderer' in item:
                            v = item['playlistVideoRenderer']
                            videos.append({
                                'videoId': v.get('videoId'),
                                'title': v.get('title', {}).get('runs', [{}])[0].get('text'),
                                'thumbnail': v.get('thumbnail', {}).get('thumbnails', [{}])[0].get('url'),
                                'viewCount': v.get('videoInfo', {}).get('runs', [{}])[0].get('text') if v.get('videoInfo') else None,
                                'publishedTime': None,
                                'length': v.get('lengthText', {}).get('simpleText')
                            })
                        elif 'lockupViewModel' in item:
                            v = item['lockupViewModel']
                            content_id = v.get('contentId')
                            meta = v.get('metadata', {}).get('lockupMetadataViewModel', {})
                            title = meta.get('title', {}).get('content') if meta.get('title') else None
                            
                            content_img = v.get('contentImage', {}).get('thumbnailViewModel', {})
                            sources = content_img.get('image', {}).get('sources', [])
                            thumb = sources[-1].get('url') if sources else None
                            
                            length = None
                            overlays = content_img.get('overlays', [])
                            for ov in overlays:
                                badge = ov.get('thumbnailBadgeViewModel', {})
                                if badge:
                                    for b_item in badge.get('badgeText', {}).get('runs', []):
                                        length = b_item.get('text')
                                        
                            if content_id:
                                videos.append({
                                    'videoId': content_id,
                                    'title': title,
                                    'thumbnail': thumb,
                                    'viewCount': None,
                                    'publishedTime': None,
                                    'length': length
                                })
                except Exception as e:
                    print(f"JSON parse error: {e}")

        if not videos:
            print("Fallback to RSS...")
            try:
                rss_url = f"https://www.youtube.com/feeds/videos.xml?playlist_id={list_id}"
                rss_res = await client.get(rss_url, timeout=10.0)
                if rss_res.status_code == 200:
                    root = ET.fromstring(rss_res.text)
                    ns = {
                        'feed': 'http://www.w3.org/2005/Atom',
                        'yt': 'http://www.youtube.com/xml/schemas/2015',
                        'media': 'http://search.yahoo.com/mrss/'
                    }
                    for entry in root.findall('feed:entry', ns):
                        v_id_el = entry.find('yt:videoId', ns)
                        title_el = entry.find('feed:title', ns)
                        thumb_el = entry.find('media:group/media:thumbnail', ns)
                        v_id = v_id_el.text if v_id_el is not None else None
                        title = title_el.text if title_el is not None else None
                        thumb = thumb_el.attrib.get('url') if thumb_el is not None else None
                        if v_id:
                            videos.append({
                                'videoId': v_id,
                                'title': title,
                                'thumbnail': thumb,
                                'viewCount': None,
                                'publishedTime': None,
                                'length': None
                            })
            except Exception as rss_err:
                print(f"RSS error: {rss_err}")
            
        return {"videos": videos}

print(asyncio.run(test_playlist("PLRLUVIeAar_BEU7YPphESo7ndk_YXQU0g")))

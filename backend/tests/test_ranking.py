"""Ranking proxy cache/failure paths and YouTube parsers, using synthetic responses."""
import json
from pathlib import Path

import httpx
import pytest
from fastapi import HTTPException

from ranking import api

pytestmark = pytest.mark.unit
URL = "https://bttf.org.bd/ranking"


def response(text, status=200):
    return httpx.Response(status, text=text, request=httpx.Request("GET", URL))


def youtube_html(items, renderer="tabRenderer"):
    data = {"contents": {"twoColumnBrowseResultsRenderer": {"tabs": [{renderer: {
        "content": {"sectionListRenderer": {"contents": [
            {"itemSectionRenderer": {"contents": items}},
        ]}},
    }}]}}}
    return "<script>var ytInitialData = " + json.dumps(data) + ";</script>"


def video(video_id="abc"):
    return {"videoId": video_id, "title": {"runs": [{"text": "Final"}]},
            "thumbnail": {"thumbnails": [{"url": "https://example.test/thumb.jpg"}]},
            "viewCountText": {"simpleText": "10 views"}, "lengthText": {"simpleText": "3:00"}}


@pytest.mark.parametrize("url", ["http://bttf.org.bd/rank", "https://bttf.org.bd.evil.test/", "https://example.test/", "https://bttf.org.bd@evil.test/"])
async def test_proxy_rejects_other_hosts(url, mock_http):
    with pytest.raises(HTTPException) as error:
        await api.proxy_ranking(url)
    assert error.value.status_code == 400
    mock_http.get.assert_not_awaited()


def test_cache_paths_stable_and_distinct():
    assert api.get_cache_path(URL) == api.get_cache_path(URL)
    assert api.get_cache_path(URL) != api.get_cache_path(URL + "?year=2026")
    assert Path(api.get_cache_path(URL)).parent == Path(api.CACHE_DIR)


async def test_proxy_fetch_saves_and_reuses_cache(mock_http):
    mock_http.get.return_value = response("<html>Ranking</html>")
    assert await api.proxy_ranking(URL) == {"html": "<html>Ranking</html>", "cached": False}
    assert await api.proxy_ranking(URL) == {"html": "<html>Ranking</html>", "cached": True}
    mock_http.get.assert_awaited_once()
    assert json.loads(Path(api.get_cache_path(URL)).read_text())["url"] == URL


@pytest.mark.parametrize("force", [False, True])
async def test_proxy_refreshes_expired_or_forced_cache(force, mock_http, monkeypatch):
    monkeypatch.setattr(api.time, "time", lambda: api.CACHE_EXPIRY + 100)
    Path(api.get_cache_path(URL)).write_text(json.dumps({"html": "Old", "timestamp": api.CACHE_EXPIRY + 99 if force else 0}))
    mock_http.get.return_value = response("New")
    assert await api.proxy_ranking(URL, force_refresh=force) == {"html": "New", "cached": False}


async def test_proxy_returns_stale_cache_when_upstream_fails(mock_http):
    Path(api.get_cache_path(URL)).write_text(json.dumps({"html": "Old", "timestamp": 0}))
    mock_http.get.side_effect = httpx.ConnectError("Offline")
    result = await api.proxy_ranking(URL)
    assert result == {"html": "Old", "cached": True, "error": "Offline"}


async def test_proxy_error_without_cache(mock_http):
    mock_http.get.return_value = response("Unavailable", 503)
    with pytest.raises(HTTPException) as error:
        await api.proxy_ranking(URL)
    assert error.value.status_code == 500


@pytest.mark.parametrize("renderer", ["tabRenderer", "expandableTabRenderer"])
async def test_youtube_search_parses_and_deduplicates(renderer, mock_http):
    mock_http.get.return_value = response(youtube_html([{"videoRenderer": video()}, {"videoRenderer": video()}, {"videoRenderer": video(None)}], renderer))
    result = await api.youtube_search("Alice Bob")
    assert result["videos"] == [{"videoId": "abc", "title": "Final", "thumbnail": "https://example.test/thumb.jpg", "viewCount": "10 views", "publishedTime": None, "length": "3:00"}]
    assert mock_http.get.await_count == 3


async def test_youtube_search_extracts_shelf_videos(mock_http):
    mock_http.get.return_value = response(youtube_html([{"shelfRenderer": {"content": {"horizontalListRenderer": {"items": [{"gridVideoRenderer": video()}]}}}}]))
    assert (await api.youtube_search("Alice"))["videos"][0]["videoId"] == "abc"


@pytest.mark.parametrize("query,count", [("Abdullah Fahim", 1), ("Alice Bob Carol Dave Eve", 4), ("A B", 1)])
async def test_youtube_search_query_limits(query, count, mock_http):
    mock_http.get.return_value = response("No results")
    assert await api.youtube_search(query) == {"videos": []}
    assert mock_http.get.await_count == count


@pytest.mark.parametrize("text", ["No data", "var ytInitialData = {", "var ytInitialData = broken;</script>"])
async def test_youtube_search_handles_missing_or_invalid_json(text, mock_http):
    mock_http.get.return_value = response(text)
    assert await api.youtube_search("Alice") == {"videos": []}


async def test_youtube_search_tolerates_upstream_failure(mock_http):
    mock_http.get.side_effect = httpx.ReadTimeout("Timeout")
    assert await api.youtube_search("Alice") == {"videos": []}


async def test_playlist_parses_legacy_and_modern_formats(mock_http):
    modern = {"lockupViewModel": {
        "contentId": "modern", "metadata": {"lockupMetadataViewModel": {"title": {"content": "Modern final"}}},
        "contentImage": {"thumbnailViewModel": {"image": {"sources": [{"url": "small"}, {"url": "large"}]},
                       "overlays": [{"thumbnailBadgeViewModel": {"badgeText": {"runs": [{"text": "5:00"}]}}}]}},
    }}
    mock_http.get.return_value = response(youtube_html([{"playlistVideoListRenderer": {"contents": [{"playlistVideoRenderer": video()}]}}, modern]))
    result = await api.youtube_playlist("playlist")
    assert [v["videoId"] for v in result["videos"]] == ["abc", "modern"]
    assert result["videos"][1]["thumbnail"] == "large"
    assert result["videos"][1]["length"] == "5:00"
    mock_http.get.assert_awaited_once()


async def test_playlist_uses_rss_fallback(mock_http):
    rss = '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/"><entry><yt:videoId>rss</yt:videoId><title>RSS final</title><media:group><media:thumbnail url="thumb"/></media:group></entry></feed>'
    mock_http.get.side_effect = [response("No HTML data"), response(rss)]
    result = await api.youtube_playlist("playlist")
    assert result["videos"][0]["videoId"] == "rss"
    assert result["videos"][0]["title"] == "RSS final"
    assert mock_http.get.await_count == 2


async def test_playlist_tolerates_malformed_html_and_rss(mock_http):
    mock_http.get.side_effect = [response("var ytInitialData = broken;</script>"), response("not XML")]
    assert await api.youtube_playlist("playlist") == {"videos": []}


async def test_playlist_reports_upstream_http_failure(mock_http):
    mock_http.get.return_value = response("Unavailable", 503)
    with pytest.raises(HTTPException) as error:
        await api.youtube_playlist("playlist")
    assert error.value.status_code == 500

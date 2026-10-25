import { extractVideoId, extractPlaylistId, isYouTubePlaylistUrl, fetchYouTubeOEmbed,
    getYouTubeThumbnail, getVideoUrl, getYouTubeMetadata } from './youtubeUtils';

test.each(['https://youtube.com/watch?v=abcdefghijk', 'https://youtu.be/abcdefghijk?t=2', 'https://youtube.com/embed/abcdefghijk'])(
    'extracts the video ID from %s', url => expect(extractVideoId(url)).toBe('abcdefghijk'),
);
test.each([null, '', 'https://example.test', 'https://youtu.be/short'])(
    'missing or unsupported video URL %j returns null', url => expect(extractVideoId(url)).toBeNull(),
);
test('extracts playlist IDs and handles missing URLs/IDs', () => {
    expect(extractPlaylistId('https://youtube.com/watch?v=abc&list=PL123#top')).toBe('PL123');
    expect(extractPlaylistId('')).toBeNull();
    expect(extractPlaylistId('https://youtube.com/watch?v=abc')).toBeNull();
});
test.each(['https://youtube.com/playlist?list=abc', 'https://www.youtube.com/watch?v=abc&list=PL1', 'http://m.youtube.com/?list=abc', 'https://youtu.be/abc?list=PL1'])(
    'accepts a real YouTube playlist URL %s', url => expect(isYouTubePlaylistUrl(url)).toBe(true),
);
test.each(['', 'not a URL', 'javascript:alert(1)', 'ftp://youtube.com/?list=abc', 'https://youtube.com.evil.test/?list=abc', 'https://example.test/?list=abc', 'https://youtube.com/?list= ', 'https://youtube.com/watch?v=abc', `https://youtube.com/?list=${'a'.repeat(500)}`])(
    'rejects unsafe or invalid playlist URL %s', url => expect(isYouTubePlaylistUrl(url)).toBe(false),
);
test('generates thumbnail/watch URLs with nullable inputs', () => {
    expect(getYouTubeThumbnail('abc')).toBe('https://img.youtube.com/vi/abc/hqdefault.jpg');
    expect(getYouTubeThumbnail('abc', 'maxresdefault')).toContain('maxresdefault.jpg');
    expect(getYouTubeThumbnail(null)).toBeNull();
    expect(getVideoUrl('abc')).toBe('https://www.youtube.com/watch?v=abc');
    expect(getVideoUrl(null)).toBeNull();
});
test('fetches oEmbed JSON using an encoded URL', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ title: 'Final' }) });
    await expect(fetchYouTubeOEmbed('https://youtu.be/abc?t=2')).resolves.toEqual({ title: 'Final' });
    expect(fetch).toHaveBeenCalledWith('https://www.youtube.com/oembed?url=https%3A%2F%2Fyoutu.be%2Fabc%3Ft%3D2&format=json');
});
test.each(['http', 'network'])('metadata %s failure returns null', async kind => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    if (kind === 'http') fetch.mockResolvedValue({ ok: false });
    else fetch.mockRejectedValue(new Error('Offline'));
    await expect(fetchYouTubeOEmbed('url')).resolves.toBeNull();
});
test('metadata helper avoids fetching without an ID', async () => {
    await expect(getYouTubeMetadata(null)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockResolvedValue({ ok: true, json: async () => ({ title: 'Final' }) });
    await expect(getYouTubeMetadata('abcdefghijk')).resolves.toEqual({ title: 'Final' });
});

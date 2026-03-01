/**
 * Utility functions for YouTube integration
 */

/**
 * Extracts the video ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null if not found
 */
export const extractVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
};

/**
 * Extracts the playlist ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - Playlist ID or null if not found
 */
export const extractPlaylistId = (url) => {
    if (!url) return null;
    const regex = /[?&]list=([^#\&\?]+)/i;
    const match = url.match(regex);
    return match ? match[1] : null;
};

/**
 * Fetches oEmbed data for a YouTube URL
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object|null>} - oEmbed data or null
 */
export const fetchYouTubeOEmbed = async (url) => {
    try {
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        if (!response.ok) throw new Error('Failed to fetch YouTube metadata');
        return await response.json();
    } catch (error) {
        console.error('YouTube oEmbed error:', error);
        return null;
    }
};

/**
 * Generates a thumbnail URL for a video ID
 * @param {string} videoId - YouTube video ID
 * @param {string} quality - 'default', 'mqdefault', 'hqdefault', 'sddefault', 'maxresdefault'
 * @returns {string} - Thumbnail URL
 */
export const getYouTubeThumbnail = (videoId, quality = 'hqdefault') => {
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
};

/**
 * Generates a direct video URL
 * @param {string} videoId - YouTube video ID
 * @returns {string} - Video URL
 */
export const getVideoUrl = (videoId) => {
    if (!videoId) return null;
    return `https://www.youtube.com/watch?v=${videoId}`;
};

/**
 * Fetches metadata for a YouTube video using oEmbed
 * @param {string} videoId 
 * @returns {Promise<Object|null>}
 */
export const getYouTubeMetadata = async (videoId) => {
    if (!videoId) return null;
    const url = getVideoUrl(videoId);
    return fetchYouTubeOEmbed(url);
};

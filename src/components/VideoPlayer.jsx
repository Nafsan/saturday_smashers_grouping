import React from 'react';
import './VideoPlayer.scss';

const VideoPlayer = ({ embedUrl, playlistUrl, onOpenPlaylist, loading = false }) => {
    return (
        <div className={`video-player-container ${!embedUrl ? 'empty' : ''}`}>
            {embedUrl ? (
                <div
                    className="video-embed-wrapper"
                    dangerouslySetInnerHTML={{ __html: embedUrl }}
                />
            ) : (
                <div className="video-placeholder">
                    {loading ? (
                        <div className="player-loading">
                            <div className="player-spinner"></div>
                            <p>Loading latest video...</p>
                        </div>
                    ) : (
                        <div className="player-empty">
                            <div className="video-icon-large">🎬</div>
                            <p>Select a video from the list below</p>
                            {playlistUrl && (
                                <button 
                                    className="open-playlist-btn"
                                    onClick={() => onOpenPlaylist ? onOpenPlaylist(playlistUrl) : window.open(playlistUrl, '_blank')}
                                >
                                    Open on YouTube
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;

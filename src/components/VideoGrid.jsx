import React from 'react';
import { Youtube, Target, FileText } from 'lucide-react';
import './VideoGrid.scss';

const VideoGrid = ({ 
    videos = [], 
    viewMode = 'grid', 
    onViewModeChange, 
    onVideoClick, 
    loading = false, 
    searching = false,
    emptyMessage = "No videos found.",
    loadingMessage = "Searching videos...",
    showControls = true,
    activeVideoId = null
}) => {
    
    const handleVideoClick = (video) => {
        if (onVideoClick) {
            onVideoClick(video);
        } else {
            window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank');
        }
    };

    if (loading || searching) {
        return (
            <div className="video-loading-state">
                <div className="video-spinner"></div>
                <p>{loadingMessage}</p>
            </div>
        );
    }

    return (
        <div className="video-grid-wrapper">
            {showControls && (
                <div className="video-controls">
                    <div className="video-view-toggle">
                        <button 
                            className={`video-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => onViewModeChange && onViewModeChange('grid')}
                            title="Grid View"
                        >
                            <Target size={18} />
                            <span>Grid</span>
                        </button>
                        <button 
                            className={`video-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => onViewModeChange && onViewModeChange('list')}
                            title="List View"
                        >
                            <FileText size={18} />
                            <span>List</span>
                        </button>
                    </div>
                    <div className="video-count">
                        {videos.length} Videos found
                    </div>
                </div>
            )}

            {videos.length > 0 ? (
                <div className={`video-container ${viewMode}`}>
                    {videos.map(video => (
                        <div 
                            key={video.videoId} 
                            className={`video-item ${viewMode === 'list' ? 'list-item' : 'card-item'} ${activeVideoId === video.videoId ? 'active' : ''}`}
                            onClick={() => handleVideoClick(video)}
                        >
                            <div className="video-thumbnail">
                                <img 
                                    src={video.thumbnail} 
                                    alt={video.title}
                                    onError={(e) => {
                                        e.target.src = '/assets/logo.png';
                                        e.target.onerror = null;
                                    }}
                                />
                                {video.length && <span className="video-duration">{video.length}</span>}
                                <div className="video-play-overlay">
                                    <Youtube size={viewMode === 'list' ? 24 : 32} color="#FF0000" />
                                </div>
                            </div>
                            <div className="video-info">
                                <div className="video-title" title={video.title}>{video.title}</div>
                                <div className="video-meta">
                                    {video.viewCount && <span className="video-views">{video.viewCount}</span>}
                                    {video.viewCount && video.publishedTime && <span className="video-dot">•</span>}
                                    {video.publishedTime && <span className="video-date">{video.publishedTime}</span>}
                                </div>
                                <button className="video-watch-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    handleVideoClick(video);
                                }}>
                                    {onVideoClick ? 'Load Video' : 'Watch on YouTube'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="video-no-results">
                    <p>{emptyMessage}</p>
                </div>
            )}
        </div>
    );
};

export default VideoGrid;

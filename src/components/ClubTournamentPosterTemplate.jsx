import React from 'react';
import {
    RANK_CHAMPION,
    RANK_RUNNER_UP,
    RANK_SEMI_FINALIST,
    RANK_QUARTER_FINALIST,
    RANK_EMOJIS,
    getPlayerRank,
} from '../utils/clubTournamentConstants';
import './ClubTournamentPosterTemplate.scss';

const ClubTournamentPosterTemplate = ({
    tournament,
    sharingMode, // 'own' or 'overall'
    selectedPlayer,
    playerAvatar,
    logoUrl,
}) => {
    if (!tournament) return null;

    const { venue, category, result, total_players, tournament_datetime } = tournament;
    const baseUrl = import.meta.env.BASE_URL || '/';
    const defaultLogo = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}assets/logo.png`;
    const effectiveLogo = logoUrl || defaultLogo;

    const formatDate = (datetime) => {
        if (!datetime) return '';
        // Ensure naive datetime strings from backend are treated as BDT (+06:00)
        const dateStr = datetime.includes('+') || datetime.endsWith('Z') ? datetime : `${datetime}+06:00`;
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Dhaka', // Always BDT
        });
    };

    const playerRank = selectedPlayer && result ? getPlayerRank(result, selectedPlayer) : null;

    const renderRankEntry = (emoji, label, names, isHighlight = false) => {
        const nameArray = Array.isArray(names) ? names : [names];
        return (
            <div className={`rank-entry ${isHighlight ? 'highlight' : ''}`}>
                <div className="rank-label">
                    <span className="rank-emoji">{emoji}</span>
                    <span className="rank-title">{label}</span>
                </div>
                <div className="rank-names">
                    {nameArray.map((name, i) => (
                        <span
                            key={i}
                            className={`player-name ${selectedPlayer && name === selectedPlayer ? 'selected' : ''}`}
                        >
                            {name}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={`club-poster-container ${sharingMode}`} id="club-tournament-poster">
            <div className="poster-watermark">Saturday Smashers</div>

            {/* Header: Venue Logo/Name + Category + Player Count */}
            <header className="poster-header">
                {venue.logo_base64 ? (
                    <img src={venue.logo_base64} alt={venue.name} className="venue-logo" />
                ) : (
                    <div className="venue-name-header">{venue.name}</div>
                )}
                <h1 className="category-title">{category}</h1>
                <div className="poster-meta">
                    <span className="meta-date">{formatDate(tournament_datetime)}</span>
                    {total_players > 0 && (
                        <>
                            <span className="meta-divider">•</span>
                            <span className="player-count">{total_players} Players</span>
                        </>
                    )}
                </div>
            </header>

            {/* Individual Mode: Player Spotlight */}
            {sharingMode === 'own' && selectedPlayer && (
                <section className="player-spotlight">
                    <div className="avatar-wrapper">
                        <img
                            src={playerAvatar || effectiveLogo}
                            alt={selectedPlayer}
                            className="player-avatar"
                        />
                    </div>
                    <div className="player-details">
                        <h2 className="spotlight-name">{selectedPlayer}</h2>
                        {playerRank && (
                            <div className="spotlight-rank">{playerRank}</div>
                        )}
                    </div>
                </section>
            )}

            {/* Results Section */}
            {result && (
                <main className="results-section">
                    {renderRankEntry(
                        RANK_EMOJIS.champion,
                        RANK_CHAMPION,
                        result.champion,
                        selectedPlayer === result.champion
                    )}
                    {renderRankEntry(
                        RANK_EMOJIS.runner_up,
                        RANK_RUNNER_UP,
                        result.runner_up,
                        selectedPlayer === result.runner_up
                    )}
                    {renderRankEntry(
                        RANK_EMOJIS.semi_finalist,
                        RANK_SEMI_FINALIST,
                        [result.semi_finalist_1, result.semi_finalist_2],
                        selectedPlayer === result.semi_finalist_1 || selectedPlayer === result.semi_finalist_2
                    )}
                    {(result.quarter_finalist_1 || result.quarter_finalist_2 || result.quarter_finalist_3 || result.quarter_finalist_4) && renderRankEntry(
                        RANK_EMOJIS.quarter_finalist,
                        RANK_QUARTER_FINALIST,
                        [
                            result.quarter_finalist_1,
                            result.quarter_finalist_2,
                            result.quarter_finalist_3,
                            result.quarter_finalist_4,
                        ].filter(Boolean),
                        selectedPlayer && [
                            result.quarter_finalist_1,
                            result.quarter_finalist_2,
                            result.quarter_finalist_3,
                            result.quarter_finalist_4,
                        ].includes(selectedPlayer)
                    )}
                </main>
            )}

            {/* Footer */}
            <footer className="poster-footer">
                <img src={effectiveLogo} alt="Saturday Smashers" className="footer-logo" />
                <p className="footer-text">Generated by Saturday Smashers</p>
            </footer>
        </div>
    );
};

export default ClubTournamentPosterTemplate;

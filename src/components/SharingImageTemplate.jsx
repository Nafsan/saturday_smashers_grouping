import React from 'react';
import './SharingImageTemplate.scss';

const SharingImageTemplate = ({
    tournamentDate,
    sharingMode, // 'own' or 'overall'
    playerName,
    playerAvatar,
    ranks,
    highlightPlayer,
    logoUrl
}) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const defaultLogo = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}assets/logo.png`;
    const effectiveLogo = logoUrl || defaultLogo;
    // Helper to get rank title based on rating
    const getRankTitle = (rating) => {
        const titles = {
            1: "Cup Champion",
            2: "Cup Runner Up",
            3: "Cup Semi Finalist",
            4: "Cup Quarter Finalist",
            5: "Plate Champion",
            6: "Plate Runner Up",
            7: "Plate Semi Finalist",
            8: "Plate Quarter Finalist"
        };
        return titles[rating] || "";
    };

    const cupRanks = ranks.filter(r => r.rating >= 1 && r.rating <= 4);
    const plateRanks = ranks.filter(r => r.rating >= 5 && r.rating <= 8);

    const playerRankGroup = highlightPlayer ? ranks.find(r => r.players.includes(highlightPlayer)) : null;

    return (
        <div className="sharing-image-container" id="sharing-image-content">
            <div className="watermark">Saturday Smashers</div>

            <header className="image-header">
                <img src={effectiveLogo} alt="Logo" className="logo" />
                <div className="tournament-info">
                    <h1>TOURNAMENT RESULTS</h1>
                    <p className="date">{tournamentDate}</p>
                </div>
            </header>

            {sharingMode === 'own' && highlightPlayer && (
                <section className="player-spotlight">
                    <div className="avatar-wrapper">
                        <img
                            src={playerAvatar || effectiveLogo}
                            alt={highlightPlayer}
                            className="player-avatar"
                        />
                    </div>
                    <div className="player-details">
                        <h2 className="player-name">{highlightPlayer}</h2>
                        {playerRankGroup && (
                            <div className="player-rank">
                                {getRankTitle(playerRankGroup.rating)}
                            </div>
                        )}
                    </div>
                </section>
            )}

            <main className="results-grid">
                <div className="bracket-column cup">
                    <h3>CUP BRACKET</h3>
                    <div className="bracket-content">
                        {cupRanks.map(r => (
                            <div key={r.rating} className={`rank-entry rating-${r.rating}`}>
                                <div className="title">{getRankTitle(r.rating)}</div>
                                <div className="players">
                                    {r.players.map(p => (
                                        <span key={p} className={p === highlightPlayer ? "highlight" : ""}>
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bracket-column plate">
                    <h3>PLATE BRACKET</h3>
                    <div className="bracket-content">
                        {plateRanks.map(r => (
                            <div key={r.rating} className={`rank-entry rating-${r.rating}`}>
                                <div className="title">{getRankTitle(r.rating)}</div>
                                <div className="players">
                                    {r.players.map(p => (
                                        <span key={p} className={p === highlightPlayer ? "highlight" : ""}>
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <footer className="image-footer">
                <p>Generated with Saturday Smashers Dashboard</p>
                <div className="social-tag">#SaturdaySmashers #TableTennis</div>
            </footer>
        </div>
    );
};

export default SharingImageTemplate;

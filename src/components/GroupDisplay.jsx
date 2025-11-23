import React, { useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { generateGroupsAction, resetGroups } from '../store/appSlice';
import { generateKnockoutFixtures } from '../logic/knockout';
import { toPng } from 'html-to-image';
import { Download, RefreshCw, ArrowLeft, Trophy, Medal } from 'lucide-react';
import './GroupDisplay.scss';

const GroupDisplay = () => {
    const { groups, rankedPlayers, tournamentDate } = useSelector(state => state.app);
    const dispatch = useDispatch();
    const exportRef = useRef(null);
    const knockoutRef = useRef(null);

    const fixtures = useMemo(() => {
        const totalPlayers = groups.groupA.length + groups.groupB.length;
        return generateKnockoutFixtures(totalPlayers);
    }, [groups]);

    const handleExport = useCallback(() => {
        if (exportRef.current === null) {
            return;
        }

        toPng(exportRef.current, { cacheBust: true, backgroundColor: '#0f172a' })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `saturday-smashers-groups-${new Date().toISOString().slice(0, 10)}.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
            });
    }, [exportRef]);

    const handleExportKnockout = useCallback(() => {
        if (knockoutRef.current === null) {
            return;
        }

        const node = knockoutRef.current;
        const config = {
            cacheBust: true,
            backgroundColor: '#0f172a',
            style: { padding: '20px' },
            width: node.scrollWidth + 40, // Add padding to width
            height: node.scrollHeight + 40 // Add padding to height
        };

        toPng(node, config)
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `saturday-smashers-knockout-${new Date().toISOString().slice(0, 10)}.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
            });
    }, [knockoutRef]);

    return (
        <div className="group-display">
            <div className="actions-bar">
                <button className="icon-btn" onClick={() => dispatch(resetGroups())}>
                    <ArrowLeft size={20} /> Back
                </button>
                <div className="right-actions">
                    <button className="icon-btn" onClick={() => dispatch(generateGroupsAction())}>
                        <RefreshCw size={20} /> Shuffle
                    </button>
                    <button className="icon-btn primary" onClick={handleExport}>
                        <Download size={20} /> Export Groups
                    </button>
                    {(fixtures.cup.length > 0 || fixtures.plate.length > 0) && (
                        <button className="icon-btn primary" onClick={handleExportKnockout}>
                            <Trophy size={20} /> Export Bracket
                        </button>
                    )}
                </div>
            </div>

            <div className="content-to-export" ref={exportRef}>
                <div className="header">
                    <h2>This Week's Groups</h2>
                    <p>{new Date(tournamentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="groups-container">
                    <div className="group-card group-a">
                        <h3>Group A</h3>
                        <ul>
                            {groups.groupA.map((player, idx) => (
                                <li key={player.name}>
                                    <span className="rank">#{idx + 1}</span>
                                    <span className="name">{player.name}</span>
                                    <span className="avg">({player.average.toFixed(1)})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="group-card group-b">
                        <h3>Group B</h3>
                        <ul>
                            {groups.groupB.map((player, idx) => (
                                <li key={player.name}>
                                    <span className="rank">#{idx + 1}</span>
                                    <span className="name">{player.name}</span>
                                    <span className="avg">({player.average.toFixed(1)})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Knockout Fixtures */}
                {(fixtures.cup.length > 0 || fixtures.plate.length > 0) && (
                    <div className="knockout-section" ref={knockoutRef}>
                        <div className="bracket-column">
                            <h3 className="cup-title"><Trophy size={18} /> Cup Round</h3>
                            {fixtures.cup.map((round, idx) => (
                                <div key={idx} className="round">
                                    <h4>{round.round}</h4>
                                    <div className="matches">
                                        {round.matches.map(m => (
                                            <div key={m.id} className="match">
                                                <span className="match-id">{m.id}</span>
                                                <div className="players">
                                                    <span>{m.p1}</span>
                                                    <span className="vs">vs</span>
                                                    <span>{m.p2}</span>
                                                </div>
                                                {m.next && <div className="next-info">→ {m.next}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bracket-column">
                            <h3 className="plate-title"><Medal size={18} /> Plate Round</h3>
                            {fixtures.plate.map((round, idx) => (
                                <div key={idx} className="round">
                                    <h4>{round.round}</h4>
                                    <div className="matches">
                                        {round.matches.map(m => (
                                            <div key={m.id} className="match">
                                                <span className="match-id">{m.id}</span>
                                                <div className="players">
                                                    <span>{m.p1}</span>
                                                    <span className="vs">vs</span>
                                                    <span>{m.p2}</span>
                                                </div>
                                                {m.next && <div className="next-info">→ {m.next}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rankings-summary">
                    <h4>Ranking Breakdown</h4>
                    <div className="rank-list">
                        {rankedPlayers.map((p, i) => (
                            <div key={p.name} className="rank-item">
                                <span className="pos">{i + 1}.</span>
                                <span className="p-name">{p.name}</span>
                                <span className="p-avg">Avg: {p.average.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupDisplay;

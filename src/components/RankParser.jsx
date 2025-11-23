import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { parseRankText } from '../logic/parser';
import { uploadRankingAsync } from '../store/appSlice';
import { Copy, Check, Upload, AlertTriangle, Lock } from 'lucide-react';
import './RankParser.scss';

// Simple Levenshtein distance for typo checking
const levenshtein = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

const RankParser = () => {
    const dispatch = useDispatch();
    const { allPlayers } = useSelector(state => state.app);

    const [input, setInput] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [copied, setCopied] = useState(false);

    // Upload State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState('');
    const [typoWarnings, setTypoWarnings] = useState([]);
    const [showTypoConfirm, setShowTypoConfirm] = useState(false);

    const handleParse = () => {
        const result = parseRankText(input);
        if (result) {
            setParsedData(result);
            setTypoWarnings([]); // Reset warnings
            setShowTypoConfirm(false);
        } else {
            alert("Could not parse the text. Please check the format.");
        }
    };

    const handleCopy = () => {
        if (parsedData) {
            navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const validatePlayers = () => {
        const warnings = [];
        const newPlayers = new Set();

        if (!parsedData) return warnings;

        parsedData.ranks.forEach(rank => {
            rank.players.forEach(player => {
                if (!allPlayers.includes(player)) {
                    // Check for typos
                    let potentialMatch = null;
                    let minDist = 3; // Threshold

                    allPlayers.forEach(existing => {
                        const dist = levenshtein(player.toLowerCase(), existing.toLowerCase());
                        if (dist < minDist) {
                            minDist = dist;
                            potentialMatch = existing;
                        }
                    });

                    if (potentialMatch) {
                        warnings.push(`"${player}" might be a typo for "${potentialMatch}"`);
                    } else {
                        newPlayers.add(player);
                    }
                }
            });
        });

        return warnings;
    };

    const initiateUpload = () => {
        setShowPasswordModal(true);
    };

    const confirmUpload = async () => {
        if (password !== "ss_admin_panel") {
            alert("Incorrect Password!");
            return;
        }

        // Check for typos first
        const warnings = validatePlayers();
        if (warnings.length > 0 && !showTypoConfirm) {
            setTypoWarnings(warnings);
            setShowTypoConfirm(true);
            setShowPasswordModal(false); // Close password modal to show typo warning
            return;
        }

        // Proceed with upload
        try {
            await dispatch(uploadRankingAsync({ tournamentData: parsedData, password })).unwrap();
            alert("Ranking Uploaded Successfully to Database! 🚀");

            setShowPasswordModal(false);
            setShowTypoConfirm(false);
            setPassword('');
            setInput('');
            setParsedData(null);
        } catch (err) {
            alert(`Upload Failed: ${err.message}`);
        }
    };

    return (
        <div className="rank-parser">
            <h3>Rank Parser Tool</h3>
            <p className="desc">Paste the raw tournament rankings below to generate the JSON code.</p>

            <textarea
                placeholder={`08/12/2025\n1. Player A\n2. Player B...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />

            <div className="actions">
                <button className="parse-btn" onClick={handleParse}>
                    Generate JSON
                </button>

                {parsedData && (
                    <button className="upload-btn" onClick={initiateUpload}>
                        <Upload size={18} /> Upload Ranking
                    </button>
                )}
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h4><Lock size={18} /> Admin Access</h4>
                        <p>Enter password to upload ranking:</p>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button onClick={() => setShowPasswordModal(false)}>Cancel</button>
                            <button className="confirm-btn" onClick={confirmUpload}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Typo Confirmation Modal */}
            {showTypoConfirm && (
                <div className="modal-overlay">
                    <div className="modal warning">
                        <h4><AlertTriangle size={20} color="#f59e0b" /> Potential Typos Found</h4>
                        <ul>
                            {typoWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                        <p>Do you want to proceed anyway?</p>
                        <div className="modal-actions">
                            <button onClick={() => setShowTypoConfirm(false)}>Cancel</button>
                            <button className="confirm-btn" onClick={async () => {
                                // Re-trigger upload logic skipping typo check
                                try {
                                    await dispatch(uploadRankingAsync({ tournamentData: parsedData, password })).unwrap();
                                    alert("Ranking Uploaded Successfully to Database! 🚀");
                                    setShowTypoConfirm(false);
                                    setInput('');
                                    setParsedData(null);
                                } catch (err) {
                                    alert(`Upload Failed: ${err.message}`);
                                }
                            }}>Yes, Upload Anyway</button>
                        </div>
                    </div>
                </div>
            )}

            {parsedData && (
                <div className="output-area">
                    <div className="output-header">
                        <span>Generated JSON</span>
                        <button className="copy-btn" onClick={handleCopy}>
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <pre>{JSON.stringify(parsedData, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default RankParser;

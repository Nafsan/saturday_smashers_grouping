/**
 * Calculates the average rank and detailed stats for players.
 * 
 * @param {Array} history - The full tournament history from JSON.
 * @param {Array<string>} activePlayers - List of player names playing this week.
 * @param {Array<{name: string, initialRank: number}>} temporaryPlayers - Temporary players with initial ranks.
 * @returns {Array} Sorted list of players with their stats.
 */
export const calculateRankings = (history, activePlayers, temporaryPlayers = []) => {
    // 1. Filter out unofficial tournaments from ranking calculation
    const officialHistory = history.filter(tournament => tournament.is_official !== false);

    // 2. Flatten history into a map of Player -> List of Ranks
    // We assume history is sorted by date descending (newest first). 
    // If not, we should sort it first.
    const sortedHistory = [...officialHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

    const playerStats = {};

    // Create a map of temporary players for quick lookup
    const tempPlayerMap = {};
    temporaryPlayers.forEach(tp => {
        tempPlayerMap[tp.name] = tp.initialRank;
    });

    // Initialize stats for active players
    activePlayers.forEach(player => {
        // Ensure player is a string (handle case where it might be an object)
        const playerName = typeof player === 'string' ? player : (player.name || String(player));
        playerStats[playerName] = {
            name: playerName,
            ranks: [],
            average: 0,
            playedCount: 0,
            isTemporary: tempPlayerMap[playerName] !== undefined
        };
    });

    // Populate ranks
    sortedHistory.forEach(tournament => {
        tournament.ranks.forEach(rankGroup => {
            rankGroup.players.forEach(playerName => {
                if (playerStats[playerName]) {
                    // Use 'rating' (1-8) instead of raw 'rank'
                    playerStats[playerName].ranks.push(rankGroup.rating);
                }
            });
        });
    });

    // Calculate Ranks and Tiebreakers
    Object.values(playerStats).forEach(stat => {
        // If this is a temporary player, use their initial rank
        if (stat.isTemporary) {
            stat.average = tempPlayerMap[stat.name];
            stat.weightedAverage = stat.average;
            stat.bestRating = stat.average;
            stat.playedCount = 0;
        } else {
            stat.playedCount = stat.ranks.length;
            // Take last 5 (which are the first 5 in our array since we sorted history desc)
            const recentRanks = stat.ranks.slice(0, 5);

            if (recentRanks.length > 0) {
                // Regular Average for display (optional, but keep for consistency if needed)
                const sum = recentRanks.reduce((a, b) => a + b, 0);
                stat.average = sum / recentRanks.length;

                // Weighted Average (Recency Bias)
                // Weights: Most recent (index 0) to oldest (index 4)
                const weights = [1.0, 0.8, 0.6, 0.4, 0.2];
                let weightedSum = 0;
                let weightTotal = 0;
                
                recentRanks.forEach((rating, index) => {
                    const weight = weights[index];
                    weightedSum += rating * weight;
                    weightTotal += weight;
                });
                
                stat.weightedAverage = weightedSum / weightTotal;
                stat.bestRating = Math.min(...recentRanks);
            } else {
                stat.average = 1000;
                stat.weightedAverage = 1000;
                stat.bestRating = 1000;
            }
        }
    });

    // Sort with Tiebreaker Logic
    const sortedPlayers = Object.values(playerStats).sort((a, b) => {
        // 1. Primary Sort: Regular Average Rank (Lower is better)
        if (a.average !== b.average) {
            return a.average - b.average;
        }

        // 2. Tiebreaker 1: Weighted Average (Recency Bias) (Lower is better)
        if (a.weightedAverage !== b.weightedAverage) {
            return a.weightedAverage - b.weightedAverage;
        }

        // 3. Tiebreaker 2: Best performance in last 5 tournaments (Lower rating is better)
        if (a.bestRating !== b.bestRating) {
            return a.bestRating - b.bestRating;
        }

        // 4. Tiebreaker 3: Attendance (Higher count is better)
        if (a.playedCount !== b.playedCount) {
            return b.playedCount - a.playedCount;
        }

        // 5. Final Tiebreaker: Alphabetical (Deterministic)
        const nameA = typeof a.name === 'string' ? a.name : String(a.name || '');
        const nameB = typeof b.name === 'string' ? b.name : String(b.name || '');
        return nameA.localeCompare(nameB);
    });

    return sortedPlayers;
};

/**
 * Extracts all unique player names from history.
 */
export const getAllPlayers = (history) => {
    const players = new Set();
    history.forEach(t => {
        t.ranks.forEach(r => {
            r.players.forEach(p => players.add(p));
        });
    });
    return Array.from(players).sort();
};

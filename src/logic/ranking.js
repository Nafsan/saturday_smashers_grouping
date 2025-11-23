/**
 * Calculates the average rank and detailed stats for players.
 * 
 * @param {Array} history - The full tournament history from JSON.
 * @param {Array<string>} activePlayers - List of player names playing this week.
 * @returns {Array} Sorted list of players with their stats.
 */
export const calculateRankings = (history, activePlayers) => {
    // 1. Flatten history into a map of Player -> List of Ranks
    // We assume history is sorted by date descending (newest first). 
    // If not, we should sort it first.
    const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

    const playerStats = {};

    // Initialize stats for active players
    activePlayers.forEach(player => {
        playerStats[player] = {
            name: player,
            ranks: [],
            average: 0,
            playedCount: 0
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

    // Calculate Averages
    Object.values(playerStats).forEach(stat => {
        stat.playedCount = stat.ranks.length;
        // Take last 5 (which are the first 5 in our array since we sorted history desc)
        const recentRanks = stat.ranks.slice(0, 5);

        if (recentRanks.length > 0) {
            const sum = recentRanks.reduce((a, b) => a + b, 0);
            stat.average = sum / recentRanks.length;
        } else {
            stat.average = 999; // No games played? Rank them last.
        }
    });

    // Sort with Tiebreaker
    const sortedPlayers = Object.values(playerStats).sort((a, b) => {
        // 1. Primary Sort: Average Rank (Lower is better)
        if (a.average !== b.average) {
            return a.average - b.average;
        }

        // 2. Tiebreaker: Compare Nth past ranks (6th, 7th, etc.)
        // We start looking from index 5 (which is the 6th item)
        let i = 5;
        while (i < a.ranks.length && i < b.ranks.length) {
            if (a.ranks[i] !== b.ranks[i]) {
                return a.ranks[i] - b.ranks[i];
            }
            i++;
        }

        // 3. If still tied, maybe prefer the one who played more games? 
        // Or the one who played fewer? 
        // User didn't specify, but usually more data is better. 
        // Let's assume if one runs out of history, they are "worse" (higher rank) 
        // to encourage playing? Or just keep them equal.
        // Let's return 0 for now.
        return 0;
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

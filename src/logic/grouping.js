/**
 * Generates a specified number of balanced groups from a sorted list of players.
 * 
 * @param {Array} sortedPlayers - Players sorted by rank (best to worst).
 * @param {number} numGroups - Number of groups to generate (default: 2).
 * @param {string} method - Group generation method ('snake' or 'random').
 * @returns {Object} { groupA: [], groupB: [], ... }
 */
export const generateGroups = (sortedPlayers, numGroups = 2, method = 'snake') => {
    // Initialize groups
    // If numGroups is 2, use legacy keys for compatibility
    const groups = {};
    const groupNames = [];

    for (let i = 0; i < numGroups; i++) {
        const name = numGroups === 2 ? (i === 0 ? 'groupA' : 'groupB') : `group${String.fromCharCode(65 + i)}`;
        groups[name] = [];
        groupNames.push(name);
    }

    if (method === 'snake') {
        let groupIndex = 0;
        let ascending = true;

        for (let i = 0; i < sortedPlayers.length; i++) {
            groups[groupNames[groupIndex]].push(sortedPlayers[i]);

            if (ascending) {
                if (groupIndex === numGroups - 1) {
                    ascending = false;
                    // Stay at same group index for next player to create snake pattern
                } else {
                    groupIndex++;
                }
            } else {
                if (groupIndex === 0) {
                    ascending = true;
                    // Stay at same group index for next player
                } else {
                    groupIndex--;
                }
            }
        }
    } else {
        // Random generation (tier-based balance)
        // Process in batches of numGroups
        for (let i = 0; i < sortedPlayers.length; i += numGroups) {
            // Create a pool for this "level" (e.g., players ranked 1, 2, 3, 4)
            const pool = [];
            for (let j = 0; j < numGroups; j++) {
                if (sortedPlayers[i + j]) {
                    pool.push(sortedPlayers[i + j]);
                }
            }

            // Shuffle the pool for this level to distribute randomly within the level
            const shuffledPool = [...pool].sort(() => Math.random() - 0.5);

            // Assign to groups
            shuffledPool.forEach((player, idx) => {
                groups[groupNames[idx]].push(player);
            });
        }
    }

    return groups;
};

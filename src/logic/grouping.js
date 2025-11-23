/**
 * Generates two balanced groups from a sorted list of players.
 * 
 * @param {Array} sortedPlayers - Players sorted by rank (best to worst).
 * @returns {Object} { groupA: [], groupB: [] }
 */
export const generateGroups = (sortedPlayers) => {
    const groupA = [];
    const groupB = [];

    // Process in pairs (1st & 2nd, 3rd & 4th, etc.)
    for (let i = 0; i < sortedPlayers.length; i += 2) {
        const player1 = sortedPlayers[i];
        const player2 = sortedPlayers[i + 1];

        // If we have an odd number of players, the last one goes to a random group
        // or we can handle it specifically. User said 12 or 14 players, so usually even.
        if (!player2) {
            // Randomly assign the last person
            if (Math.random() > 0.5) groupA.push(player1);
            else groupB.push(player1);
            break;
        }

        // Randomly assign pair members
        if (Math.random() > 0.5) {
            groupA.push(player1);
            groupB.push(player2);
        } else {
            groupA.push(player2);
            groupB.push(player1);
        }
    }

    return { groupA, groupB };
};

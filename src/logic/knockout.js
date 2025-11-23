/**
 * Generates the knockout fixture structure based on the number of players.
 * 
 * @param {number} playerCount - Total number of players (10, 12, 14, 16).
 * @returns {Object} { cup: [], plate: [] } - Lists of matches/rounds.
 */
export const generateKnockoutFixtures = (playerCount) => {
    const fixtures = {
        cup: [],
        plate: []
    };

    if (playerCount === 12) {
        // 12 Players: Top 3 Cup, Bottom 3 Plate
        // Cup: 6 players. A1, B1 Bye.
        fixtures.cup = [
            {
                round: "Quarter Finals",
                matches: [
                    { id: "CQ1", p1: "A2", p2: "B3", next: "Winner plays B1" },
                    { id: "CQ2", p1: "A3", p2: "B2", next: "Winner plays A1" }
                ]
            },
            {
                round: "Semi Finals",
                matches: [
                    { id: "CS1", p1: "A1", p2: "Winner CQ2 (A3/B2)" },
                    { id: "CS2", p1: "B1", p2: "Winner CQ1 (A2/B3)" }
                ]
            },
            {
                round: "Final",
                matches: [
                    { id: "CF", p1: "Winner CS1", p2: "Winner CS2" }
                ]
            }
        ];

        // Plate: 6 players. A4, B4 Bye.
        fixtures.plate = [
            {
                round: "Quarter Finals",
                matches: [
                    { id: "PQ1", p1: "A5", p2: "B6", next: "Winner plays B4" },
                    { id: "PQ2", p1: "A6", p2: "B5", next: "Winner plays A4" }
                ]
            },
            {
                round: "Semi Finals",
                matches: [
                    { id: "PS1", p1: "A4", p2: "Winner PQ2 (A6/B5)" },
                    { id: "PS2", p1: "B4", p2: "Winner PQ1 (A5/B6)" }
                ]
            },
            {
                round: "Final",
                matches: [
                    { id: "PF", p1: "Winner PS1", p2: "Winner PS2" }
                ]
            }
        ];
    } else if (playerCount === 14) {
        // 14 Players: Top 4 Cup, Bottom 3 Plate
        // Cup: 8 players. Full QF.
        fixtures.cup = [
            {
                round: "Quarter Finals",
                matches: [
                    { id: "CQ1", p1: "A1", p2: "B4" },
                    { id: "CQ2", p1: "A2", p2: "B3" },
                    { id: "CQ3", p1: "A3", p2: "B2" },
                    { id: "CQ4", p1: "A4", p2: "B1" }
                ]
            },
            {
                round: "Semi Finals",
                matches: [
                    { id: "CS1", p1: "Winner CQ1", p2: "Winner CQ3" },
                    { id: "CS2", p1: "Winner CQ2", p2: "Winner CQ4" }
                ]
            },
            {
                round: "Final",
                matches: [
                    { id: "CF", p1: "Winner CS1", p2: "Winner CS2" }
                ]
            }
        ];

        // Plate: 6 players (Bottom 3 from each group: 5, 6, 7). 
        // Same format as 12 player plate.
        // A5, B5 get Byes? 
        // "The plate round's format will be same as the plate round of 12 player's tournament."
        // In 12 player: A4, B4 got byes. Here A5, B5 are the top seeds of plate.
        fixtures.plate = [
            {
                round: "Quarter Finals",
                matches: [
                    { id: "PQ1", p1: "A6", p2: "B7", next: "Winner plays B5" },
                    { id: "PQ2", p1: "A7", p2: "B6", next: "Winner plays A5" }
                ]
            },
            {
                round: "Semi Finals",
                matches: [
                    { id: "PS1", p1: "A5", p2: "Winner PQ2" },
                    { id: "PS2", p1: "B5", p2: "Winner PQ1" }
                ]
            },
            {
                round: "Final",
                matches: [
                    { id: "PF", p1: "Winner PS1", p2: "Winner PS2" }
                ]
            }
        ];
    } else if (playerCount === 10) {
        // 10 Players: Top 3 Cup, Bottom 2 Plate
        // Cup: Same as 12 player cup.
        fixtures.cup = [
            {
                round: "Quarter Finals",
                matches: [
                    { id: "CQ1", p1: "A2", p2: "B3", next: "Winner plays B1" },
                    { id: "CQ2", p1: "A3", p2: "B2", next: "Winner plays A1" }
                ]
            },
            {
                round: "Semi Finals",
                matches: [
                    { id: "CS1", p1: "A1", p2: "Winner CQ2" },
                    { id: "CS2", p1: "B1", p2: "Winner CQ1" }
                ]
            },
            {
                round: "Final",
                matches: [
                    { id: "CF", p1: "Winner CS1", p2: "Winner CS2" }
                ]
            }
        ];

        // Plate: 4 players (4, 5). Semis directly.
        fixtures.plate = [
            {
                round: "Semi Finals",
                matches: [
                    { id: "PS1", p1: "A4", p2: "B5" },
                    { id: "PS2", p1: "A5", p2: "B4" }
                ]
            },
            {
                round: "Final",
                matches: [
                    { id: "PF", p1: "Winner PS1", p2: "Winner PS2" }
                ]
            }
        ];
    } else if (playerCount === 16) {
        // 16 Players: Top 4 Cup, Bottom 4 Plate.
        // Both are 8 player brackets (QF -> SF -> F).
        const standard8Bracket = (prefix) => [
            {
                round: "Quarter Finals",
                matches: [
                    { id: `${prefix}Q1`, p1: "A1", p2: "B4" },
                    { id: `${prefix}Q2`, p1: "A2", p2: "B3" },
                    { id: `${prefix}Q3`, p1: "A3", p2: "B2" },
                    { id: `${prefix}Q4`, p1: "A4", p2: "B1" }
                ]
            },
            {
                round: "Semi Finals",
                matches: [
                    { id: `${prefix}S1`, p1: `Winner ${prefix}Q1`, p2: `Winner ${prefix}Q3` },
                    { id: `${prefix}S2`, p1: `Winner ${prefix}Q2`, p2: `Winner ${prefix}Q4` }
                ]
            },
            {
                round: "Final",
                matches: [
                    { id: `${prefix}F`, p1: `Winner ${prefix}S1`, p2: `Winner ${prefix}S2` }
                ]
            }
        ];

        fixtures.cup = standard8Bracket('C');

        // Plate uses 5,6,7,8.
        // Map A1->A5, B4->B8 etc.
        fixtures.plate = [
            {
                round: "Quarter Finals",
                matches: [
                    { id: "PQ1", p1: "A5", p2: "B8" },
                    { id: "PQ2", p1: "A6", p2: "B7" },
                    { id: "PQ3", p1: "A7", p2: "B6" },
                    { id: "PQ4", p1: "A8", p2: "B5" }
                ]
            },
            {
                round: "Semi Finals",
                matches: [
                    { id: "PS1", p1: "Winner PQ1", p2: "Winner PQ3" },
                    { id: "PS2", p1: "Winner PQ2", p2: "Winner PQ4" }
                ]
            },
            {
                round: "Final",
                matches: [
                    { id: "PF", p1: "Winner PS1", p2: "Winner PS2" }
                ]
            }
        ];
    }

    return fixtures;
};

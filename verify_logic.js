import { calculateRankings } from './src/logic/ranking.js';

const mockHistory = [
    {
        date: "2025-11-22",
        ranks: [
            { rank: 1, players: ["A"] },
            { rank: 2, players: ["B"] }
        ]
    },
    {
        date: "2025-11-15",
        ranks: [
            { rank: 2, players: ["A"] }, // A avg = 1.5
            { rank: 1, players: ["B"] }  // B avg = 1.5
        ]
    },
    {
        date: "2025-11-08",
        ranks: [
            { rank: 1, players: ["A"] }, // A: 1, 2, 1
            { rank: 3, players: ["B"] }  // B: 2, 1, 3
        ]
    }
];

// Test 1: Basic Average
// A: (1+2+1)/3 = 1.33
// B: (2+1+3)/3 = 2.0
console.log("Test 1: Basic Average");
const res1 = calculateRankings(mockHistory, ["A", "B"]);
if (res1[0].name === "A" && res1[1].name === "B") {
    console.log("PASS: A is ranked higher than B");
} else {
    console.error("FAIL: Expected A then B", res1);
}

// Test 2: Tie Breaker
// Let's make their averages same.
// A: 1, 2
// B: 2, 1
// Avg both 1.5.
// Tiebreaker: 3rd game.
// A: 1, 2, 1 (3rd is 1)
// B: 2, 1, 3 (3rd is 3)
// A should win (lower rank is better).
console.log("Test 2: Tie Breaker");
const res2 = calculateRankings(mockHistory, ["A", "B"]);
console.log(`A stats: Avg ${res2.find(p => p.name === 'A').average}`);
console.log(`B stats: Avg ${res2.find(p => p.name === 'B').average}`);

// Actually in my mock data above:
// A: 1, 2, 1 -> Avg 1.33
// B: 2, 1, 3 -> Avg 2.0
// So A is already better.

// Let's force a tie in avg
const tieHistory = [
    { date: "1", ranks: [{ rank: 1, players: ["A"] }, { rank: 2, players: ["B"] }] },
    { date: "2", ranks: [{ rank: 2, players: ["A"] }, { rank: 1, players: ["B"] }] },
    // Avg so far: A=1.5, B=1.5
    // Tiebreaker needed.
    { date: "3", ranks: [{ rank: 1, players: ["A"] }, { rank: 5, players: ["B"] }] }
];
// A ranks: 1, 2, 1
// B ranks: 2, 1, 5
// A avg: 1.33, B avg: 2.66. Still no tie.

// True Tie Construction:
// A: 1, 2
// B: 2, 1
// Next game:
// A: 3
// B: 3
// A: 1, 2, 3 -> Avg 2
// B: 2, 1, 3 -> Avg 2
// Tiebreaker: Look at history.
// A ranks: [1, 2, 3]
// B ranks: [2, 1, 3]
// Sorted by date desc in logic?
// Logic sorts history by date desc.
// So if input is Date 3 (newest), Date 2, Date 1.
// A: 3, 2, 1
// B: 3, 1, 2
// Avg: 2.
// Tiebreaker loop starts at index 5. Wait, my logic says "We start looking from index 5".
// That means it ONLY looks at 6th game for tie breaker?
// "Multiple people may have the same rank, in that case, we can take the last 6th number tournaments rank for those peoples for the tiebreaker"
// The user requirement was specific: "take the last 6th number tournaments rank".
// So if they only have 5 games, and averages are equal, they are TIED.
// My logic:
// let i = 5;
// while (i < a.ranks.length...)
// So yes, it strictly follows the "6th tournament" rule.

console.log("Test 3: Tie Breaker with 6th game");
const deepHistory = [
    { date: "6", ranks: [{ rank: 1, players: ["A", "B"] }] }, // 1st recent
    { date: "5", ranks: [{ rank: 1, players: ["A", "B"] }] }, // 2nd
    { date: "4", ranks: [{ rank: 1, players: ["A", "B"] }] }, // 3rd
    { date: "3", ranks: [{ rank: 1, players: ["A", "B"] }] }, // 4th
    { date: "2", ranks: [{ rank: 1, players: ["A", "B"] }] }, // 5th
    // Avg is 1.0 for both.
    { date: "1", ranks: [{ rank: 1, players: ["A"] }, { rank: 2, players: ["B"] }] } // 6th (Oldest here)
];
// A ranks: [1,1,1,1,1,1]
// B ranks: [1,1,1,1,1,2]
// Index 5 is the 6th item.
// A[5] = 1
// B[5] = 2
// A should be ranked higher (index 0).

const res3 = calculateRankings(deepHistory, ["A", "B"]);
if (res3[0].name === "A") {
    console.log("PASS: Tiebreaker worked, A is #1");
} else {
    console.error("FAIL: Tiebreaker failed", res3);
}

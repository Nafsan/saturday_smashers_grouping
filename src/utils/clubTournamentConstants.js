/**
 * Constants for the Club Tournaments feature.
 */

// Filter options
export const FILTER_ALL = 'all';
export const FILTER_UPCOMING = 'upcoming';
export const FILTER_PAST = 'past';

export const FILTER_OPTIONS = [
    { value: FILTER_ALL, label: 'All Tournaments' },
    { value: FILTER_UPCOMING, label: 'Upcoming' },
    { value: FILTER_PAST, label: 'Past' },
];

// Rank labels
export const RANK_CHAMPION = 'Champion';
export const RANK_RUNNER_UP = 'Runner Up';
export const RANK_SEMI_FINALIST = 'Semi Finalist';
export const RANK_QUARTER_FINALIST = 'Quarter Finalist';

export const RANK_LABELS = {
    champion: RANK_CHAMPION,
    runner_up: RANK_RUNNER_UP,
    semi_finalist: RANK_SEMI_FINALIST,
    quarter_finalist: RANK_QUARTER_FINALIST,
};

// Rank icons/emojis
export const RANK_EMOJIS = {
    champion: '🥇',
    runner_up: '🥈',
    semi_finalist: '🥉',
    quarter_finalist: '🏅',
};

// Status labels
export const STATUS_LABELS = {
    upcoming: 'Upcoming',
    past: 'Completed',
};

// Messages
export const EMPTY_STATE_MESSAGE = 'No tournaments found';
export const EMPTY_STATE_FILTERED_MESSAGE = 'No tournaments match the selected filter';
export const TOURNAMENT_CREATED_MESSAGE = 'Tournament created successfully! 🎉';
export const TOURNAMENT_UPDATED_MESSAGE = 'Tournament updated successfully! ✅';
export const TOURNAMENT_DELETED_MESSAGE = 'Tournament deleted successfully! 🗑️';
export const RESULTS_SUBMITTED_MESSAGE = 'Results submitted successfully! 🏆';
export const RESULTS_UPDATED_MESSAGE = 'Results updated successfully! ✅';
export const VENUE_CREATED_MESSAGE = 'Venue added successfully! 🏟️';
export const VENUE_UPDATED_MESSAGE = 'Venue updated successfully! ✅';
export const VENUE_DELETED_MESSAGE = 'Venue deleted successfully! 🗑️';

/**
 * Extract the 8 players from a tournament result into a flat array.
 */
export const getPlayersFromResult = (result) => {
    if (!result) return [];
    return [
        result.champion,
        result.runner_up,
        result.semi_finalist_1,
        result.semi_finalist_2,
        result.quarter_finalist_1,
        result.quarter_finalist_2,
        result.quarter_finalist_3,
        result.quarter_finalist_4,
    ];
};

/**
 * Get the rank label for a given player from the result.
 */
export const getPlayerRank = (result, playerName) => {
    if (!result || !playerName) return null;
    if (result.champion === playerName) return RANK_CHAMPION;
    if (result.runner_up === playerName) return RANK_RUNNER_UP;
    if (result.semi_finalist_1 === playerName || result.semi_finalist_2 === playerName) return RANK_SEMI_FINALIST;
    if (
        result.quarter_finalist_1 === playerName ||
        result.quarter_finalist_2 === playerName ||
        result.quarter_finalist_3 === playerName ||
        result.quarter_finalist_4 === playerName
    ) return RANK_QUARTER_FINALIST;
    return null;
};

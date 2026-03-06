"""
Constants for the Club Tournament module.
"""

# Tournament status values (derived from datetime, not stored)
TOURNAMENT_STATUS_ALL = "all"
TOURNAMENT_STATUS_UPCOMING = "upcoming"
TOURNAMENT_STATUS_PAST = "past"

VALID_STATUSES = [TOURNAMENT_STATUS_ALL, TOURNAMENT_STATUS_UPCOMING, TOURNAMENT_STATUS_PAST]

# Rank labels for results display
RANK_CHAMPION = "Champion"
RANK_RUNNER_UP = "Runner Up"
RANK_SEMI_FINALIST = "Semi Finalist"
RANK_QUARTER_FINALIST = "Quarter Finalist"

RANK_LABELS = {
    1: RANK_CHAMPION,
    2: RANK_RUNNER_UP,
    3: RANK_SEMI_FINALIST,
    4: RANK_QUARTER_FINALIST,
}

# Error messages
ERROR_TOURNAMENT_NOT_FOUND = "Tournament not found"
ERROR_VENUE_NOT_FOUND = "Venue not found"
ERROR_VENUE_NAME_EXISTS = "A venue with this name already exists"
ERROR_RESULTS_ALREADY_EXIST = "Results already submitted for this tournament"
ERROR_RESULTS_NOT_FOUND = "Results not found for this tournament"
ERROR_INVALID_PASSWORD = "Invalid password"
ERROR_INVALID_STATUS_FILTER = "Invalid status filter. Must be one of: all, upcoming, past"
ERROR_VENUE_IN_USE = "Cannot delete venue that is used by existing tournaments"

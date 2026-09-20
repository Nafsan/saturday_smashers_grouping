import json

# Sample tournament data representing singles tournaments
tournaments = [
    {
        "id": "t1", "date": "2026-03-01",
        "ranks": [
            {"rating": 1, "players": ["Abdullah"]}, # Cup Champion
            {"rating": 2, "players": ["Showmik"]},  # Cup Runner Up
            {"rating": 3, "players": ["Dipro", "Fahim"]}, # Semi Finalists
        ]
    },
    {
        "id": "t2", "date": "2026-02-22",
        "ranks": [
            {"rating": 1, "players": ["Abdullah"]},
            {"rating": 2, "players": ["Dipro"]},
            {"rating": 3, "players": ["Showmik", "Fahim"]},
        ]
    },
    {
        "id": "t3", "date": "2026-02-15",
        "ranks": [
            {"rating": 1, "players": ["Showmik"]},
            {"rating": 2, "players": ["Abdullah"]},
            {"rating": 3, "players": ["Dipro", "Fahim"]},
        ]
    }
]

def analyze_singles_rivalries(player_name, tournaments):
    rivals = {} # name -> {finals_against: 0, shared_tournaments: 0, wins_against_in_finals: 0}
    
    for t in tournaments:
        player_rating = None
        other_ratings = {}
        
        for r in t["ranks"]:
            for p in r["players"]:
                if p == player_name:
                    player_rating = r["rating"]
                else:
                    other_ratings[p] = r["rating"]
                    
        if player_rating is None:
            continue
            
        for o_name, o_rating in other_ratings.items():
            if o_name not in rivals:
                rivals[o_name] = {"finals_against": 0, "shared_tournaments": 0, "finals_won": 0, "finals_lost": 0}
            rivals[o_name]["shared_tournaments"] += 1
            
            # Check if faced in Cup Final (ratings 1 and 2) or Plate Final (ratings 5 and 6)
            if (player_rating == 1 and o_rating == 2) or (player_rating == 2 and o_rating == 1):
                rivals[o_name]["finals_against"] += 1
                if player_rating == 1:
                    rivals[o_name]["finals_won"] += 1
                else:
                    rivals[o_name]["finals_lost"] += 1
            elif (player_rating == 5 and o_rating == 6) or (player_rating == 6 and o_rating == 5):
                rivals[o_name]["finals_against"] += 1
                if player_rating == 5:
                    rivals[o_name]["finals_won"] += 1
                else:
                    rivals[o_name]["finals_lost"] += 1

    # Sort rivals by finals_against desc, then shared_tournaments desc
    sorted_rivals = sorted(
        rivals.items(),
        key=lambda x: (x[1]["finals_against"], x[1]["shared_tournaments"]),
        reverse=True
    )
    
    if sorted_rivals:
        top_name, top_data = sorted_rivals[0]
        if top_data["finals_against"] > 0:
            return f"{top_name} ({top_data['finals_against']} Final Matchups: {top_data['finals_won']}W-{top_data['finals_lost']}L)"
        else:
            return f"{top_name} ({top_data['shared_tournaments']} Shared Tournaments)"
    return "N/A"

print(analyze_singles_rivalries("Abdullah", tournaments))

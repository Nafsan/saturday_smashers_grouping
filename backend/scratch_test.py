import os
import json
import math
import dotenv
dotenv.load_dotenv()
from huggingface_hub import InferenceClient

token = os.getenv('HF_TOKEN')
client = InferenceClient(token=token)

tournaments = [
    {
        "id": "t1", "date": "2026-03-01",
        "ranks": [
            {"rating": 1, "players": ["Abdullah"]},
            {"rating": 2, "players": ["Showmik"]},
            {"rating": 3, "players": ["Dipro", "Fahim"]},
            {"rating": 4, "players": ["Tanvir"]},
            {"rating": 5, "players": ["Sakib"]},
            {"rating": 6, "players": ["Ratul"]},
        ]
    },
    {
        "id": "t2", "date": "2026-02-22",
        "ranks": [
            {"rating": 1, "players": ["Abdullah"]},
            {"rating": 2, "players": ["Dipro"]},
            {"rating": 3, "players": ["Showmik", "Fahim"]},
            {"rating": 5, "players": ["Sakib"]},
        ]
    },
    {
        "id": "t3", "date": "2026-02-15",
        "ranks": [
            {"rating": 1, "players": ["Showmik"]},
            {"rating": 2, "players": ["Dipro"]},
            {"rating": 4, "players": ["Abdullah"]},
            {"rating": 5, "players": ["Fahim"]},
        ]
    }
]

player_name = "Abdullah"

rating_titles = {
    1: "Cup Champion", 2: "Cup Runner Up", 3: "Cup Semi Finalist", 4: "Cup Quarter Finalist",
    5: "Plate Champion", 6: "Plate Runner Up", 7: "Plate Semi Finalist", 8: "Plate Quarter Finalist"
}
rating_values = {1: 95, 2: 85, 3: 75, 4: 65, 5: 50, 6: 40, 7: 30, 8: 20}

all_ratings = []
same_tier_peers = {}

for t in tournaments:
    player_rating = None
    other_players_in_t = {}
    
    for r in t["ranks"]:
        for p in r["players"]:
            if p == player_name:
                player_rating = r["rating"]
            else:
                other_players_in_t[p] = r["rating"]

    if player_rating is not None:
        all_ratings.append(player_rating)

        for o_name, o_rating in other_players_in_t.items():
            if o_name not in same_tier_peers:
                same_tier_peers[o_name] = {"same_tier": 0, "shared": 0}
            same_tier_peers[o_name]["shared"] += 1
            if o_rating == player_rating:
                same_tier_peers[o_name]["same_tier"] += 1

total = len(all_ratings)

cup_appearances = sum(1 for r in all_ratings if r in [1, 2, 3, 4])
plate_appearances = sum(1 for r in all_ratings if r in [5, 6, 7, 8])

cup_wins = sum(1 for r in all_ratings if r == 1)
cup_finals = sum(1 for r in all_ratings if r in [1, 2])
plate_wins = sum(1 for r in all_ratings if r == 5)

cup_qual_rate = round((cup_appearances / total) * 100)
relegation_rate = round((plate_appearances / total) * 100)

recent_5 = all_ratings[:5]
recent_avg_val = sum(rating_values[r] for r in recent_5) / len(recent_5)
form_score = max(15, min(99, int(round(recent_avg_val))))

recent_cup_rate = (sum(1 for r in recent_5 if r <= 4) / len(recent_5)) * 100
overall_cup_rate = (cup_appearances / total) * 100

recent_avg_rank = sum(recent_5) / len(recent_5)
overall_avg_rank = sum(all_ratings) / total

variance = sum((x - recent_avg_rank) ** 2 for x in recent_5) / len(recent_5)
std_dev_recent = math.sqrt(variance)

if recent_cup_rate > overall_cup_rate + 10:
    momentum = "Heating Up"
elif recent_avg_rank <= 2.0:
    momentum = "Peak Form"
elif sum(1 for r in recent_5 if r >= 5) >= 2:
    momentum = "Relegation Risk"
elif std_dev_recent >= 2.0:
    momentum = "Volatile"
else:
    momentum = "Steady"

std_dev_total = math.sqrt(sum((x - overall_avg_rank) ** 2 for x in all_ratings) / total)
if std_dev_total < 1.2:
    consistency = "Rock Solid"
elif std_dev_total < 2.2:
    consistency = "Balanced"
else:
    consistency = "Inconsistent"

peer_competitor_str = "N/A"
if same_tier_peers:
    sorted_peers = sorted(
        same_tier_peers.items(),
        key=lambda x: (x[1]["same_tier"], x[1]["shared"]),
        reverse=True
    )
    p_name, p_data = sorted_peers[0]
    if p_data["same_tier"] > 0:
        peer_competitor_str = f"{p_name} ({p_data['same_tier']} Shared Levels)"
    else:
        peer_competitor_str = f"{p_name} ({p_data['shared']} Shared Tournaments)"

if cup_qual_rate >= 80 and cup_wins >= 1:
    archetype = "Elite Cup Contender"
elif cup_qual_rate >= 70:
    archetype = "Cup Division Regular"
elif relegation_rate >= 50 and plate_wins >= 1:
    archetype = "Plate Division Fighter"
elif total <= 3:
    archetype = "New Challenger"
else:
    archetype = "Developing Player"

prompt = f"""<|system|>
You are an expert sports performance analyst for a table tennis club called 'Saturday Smashers'.
Generate a deep, structured performance analysis for a player based on verified tournament stats.

SATURDAY SMASHERS TOURNAMENT STRUCTURE & TERMINOLOGY:
1. All tournaments are SINGLES tournaments.
2. Group rounds divide players into two divisions:
   - CUP DIVISION (Ratings 1-4: Champion, Runner Up, Semi Finalist, Quarter Finalist) = Elite upper tier. Qualifying for Cup is the primary benchmark.
   - PLATE DIVISION (Ratings 5-8: Champion, Runner Up, Semi Finalist, Quarter Finalist) = Relegated lower tier for players who struggled in group rounds. Relegation to Plate shows group stage struggle / improvement needed.
3. DO NOT mention "podium", "podiums", "doubles", or "partners".

STRICT REQUIREMENTS:
1. Output MUST be ONLY a valid JSON object matching the format below.
2. DO NOT wrap JSON in codeblocks or markdown.
3. Be analytical, professional, concise, and specific to the player's data.

JSON SCHEMA:
{{
  "archetype": "{archetype}",
  "headline": "A punchy 1-sentence summary of Cup qualification rate and recent form.",
  "key_insights": [
    {{
      "category": "strength",
      "title": "Short Title (2-4 words)",
      "text": "1-2 analytical sentences on Cup division performance and championship conversions."
    }},
    {{
      "category": "form_trend",
      "title": "Short Title (2-4 words)",
      "text": "1-2 analytical sentences evaluating recent 5-week form trajectory versus career average."
    }},
    {{
      "category": "growth",
      "title": "Short Title (2-4 words)",
      "text": "1-2 analytical sentences highlighting group stage consistency or Plate relegation risk."
    }}
  ],
  "tactical_summary": "2-sentence actionable recommendation for improving Cup qualification and knock-out stage finishes."
}}
</s>
<|user|>
Player Statistics for {player_name}:
- Total Tournaments Played: {total} (Singles)
- Cup Qualification Rate: {cup_qual_rate}% ({cup_appearances}/{total} tournaments in Cup Division)
- Plate Relegation Rate: {relegation_rate}% ({plate_appearances}/{total} tournaments in Plate Division)
- Cup Wins: {cup_wins} (Cup Finals: {cup_finals})
- Calculated Form Rating: {form_score}/100
- Momentum Trend: {momentum}
- Consistency Profile: {consistency}
- Benchmark Peer Competitor: {peer_competitor_str}

RECENT FORM (LAST 5 TOURNAMENTS):
{", ".join([f"Week {i+1}: {rating_titles[r]}" for i, r in enumerate(recent_5)])}

CAREER BASELINE:
- Best Finish: {rating_titles[min(all_ratings)]}
- Total Cup Finals: {cup_finals}, Total Plate Championships: {plate_wins}
</s>
<|assistant|>"""

res = client.chat_completion(
    model="Qwen/Qwen2.5-72B-Instruct",
    messages=[{"role": "user", "content": prompt}],
    max_tokens=450,
    temperature=0.3
)

print(res.choices[0].message.content.strip())

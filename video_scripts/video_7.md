# Video 7: Demo, Future Directions, and Series Wrap-Up

---

## INTRO

"Welcome to the final video of the series.

We've come a long way. We started with 9.6 gigabytes of raw baseball data and a blank Geo space. We designed a full knowledge graph ontology, published the schema, populated it with the 2024 season, and built a working web app on top.

Today I want to do two things. First, a proper demo of the app and the graph — showing the queries and traversals that really illustrate what a knowledge graph makes possible. Second, I want to talk about where this goes from here, because what we've built is a foundation, not a finished product."

---

## THE GRAPH BY THE NUMBERS

[Open Geo browser or run a summary query against the API]

"Let me start by showing you what's actually in the graph right now.

The 2024 season:
- 2,430 regular season games
- ~900 players with full biographical data and career relations
- 30 teams with geographic and league relations
- 30 ballparks
- Somewhere around 180,000 plays
- Over 60,000 batting performances, 60,000 pitching performances, 60,000 fielding performances

Every one of those is a structured entity with typed properties and navigable relations. This isn't a flat CSV sitting on a server — it's a live, queryable graph."

---

## APP DEMO

[Open the app in browser]

### Core experience

"Let me start with the core experience. I'm opening the app and looking at the game list for the 2024 season."

[Show the list view — games with dates, teams, scores]

"I'll pick a game — let's take [a notable game, e.g., a playoff game or a notable performance]."

[Open the game detail view]

"Here's the full game context: home team, away team, ballpark, managers, starting pitchers, umpires, final score, attendance, day or night game. All fetched in a single GraphQL traversal from the graph.

Now let me open the play-by-play."

[Open the plays tab / play-by-play view]

"Every play in the game, inning by inning. I can see the batter, the pitcher, the base state going in, the event type, the outcome. Let me click into one play."

[Click a specific play — home run or strikeout]

"Here's the full play entity — inning, count, pitch sequence if we have it, base state before and after, runs scored. And the batter and pitcher are both relations — I can navigate to them directly."

[Click through to a player]

"And here's the player entity. Birth city, position, handedness — all as relations. Let me click through to the birth city."

[Click City → State → Country]

"That's the geographic chain we designed in Video 2. One player, connected through three levels of geographic hierarchy to a shared Country entity that anyone on Geo can reference."

---

### Power queries

"Now let me show you the kind of queries that are only possible with a structured knowledge graph — not a flat database.

These aren't in the app UI, I'll run them directly against the GraphQL API."

**Query 1 — All players born in a specific country**

[Run a GraphQL query: players where Birth country relation = Japan (or Dominican Republic, etc.)]

"Give me every player in our graph born in [country]. Because Birth city is a relation to a City entity, and City has a relation to a Country entity, I can traverse that chain and filter on it. With a flat dataset this would require string matching on a 'birth country' field — fragile, inconsistent. Here it's a typed relation filter."

[Show the results — a list of players with their names and birth cities]

**Query 2 — All games at a specific ballpark**

[Run a query: games where Ballpark relation = Fenway Park]

"Every game played at Fenway Park in the 2024 season, with dates and scores. Again — because the Game entity has a Ballpark relation, not a text field, this query is clean and reliable."

[Show results]

**Query 3 — Top home run games**

[Run a query aggregating home runs from batting performances, group by game]

"Which games in 2024 had the most combined home runs? This requires aggregating across Batting performance entities — one per player per game — and grouping by the Game relation. This is a traversal query, not a join."

[Show results — highlight a high-scoring game]

"Let me click through to one of these games and see the batting performance detail."

---

## FUTURE DIRECTIONS

"Now let me talk about where this goes from here. What we've built is the 2024 season. But the Retrosheet archive goes back to 1871. And there are several natural directions to extend this project."

### Full historical dataset

"The most obvious extension is the full dataset. We have everything downloaded and parsed already — every game from 1871 to 2025. The bulk publishing scripts we wrote are already designed to handle it. It's a question of running time and resources.

Historically, some of the most interesting data is the older records — Babe Ruth's season stats, DiMaggio's hitting streak, integration-era games. That data is in our files, ready to publish."

### Live MLB data

"The Retrosheet archive ends at the close of each season. For live, in-season data, the MLB Stats API is the source — Statcast pitch-by-pitch data, current season gamelogs, real-time box scores.

The Chadwick Bureau maintains a public register that maps Retrosheet player IDs to MLB player IDs. So you could link our historical Player entities to live Statcast data — same entity, richer data as the season progresses.

One legal note: MLB Stats data is proprietary. Using it for commercial purposes requires a license. Educational and research use is generally fine, but worth knowing."

### Data enrichment and community contributions

"Because the graph is open and decentralized, anyone can contribute to it. A few ideas:

- **Player photos.** Images can be published as Cover properties on Player entities. Someone could run a script to add Wikipedia photos for Hall of Famers.
- **Descriptions.** Rich text descriptions of historic games, notable players, famous ballparks. Community-contributed and permanently attached to the entity.
- **Negro League data.** The Negro Leagues were excluded from official MLB records for most of their history. Retrosheet has partial data; other archives have more. A contribution effort to add those games and players to the graph would be genuinely valuable.
- **International leagues.** Japan's NPB, Korea's KBO, winter leagues — other open data sources exist. The same ontology patterns apply."

### Prediction markets and bots

"One more use case worth mentioning. Platforms like Polymarket run prediction markets on baseball outcomes — will this team win, will this player hit .300. Those markets need structured, queryable historical data to set odds and calibrate models.

A well-structured knowledge graph with 150 years of game outcomes and player stats is exactly the kind of data a prediction market bot would want to query. The Geo API makes that straightforward."

### Other apps

"And of course, more apps. We built one. But the graph supports many:

- A fantasy research tool — filter players by position, era, stat thresholds
- A 'Today in baseball history' feature — pull notable games from this date in any year
- A career timeline browser — visualize a player's teams and stats across their career
- A ballpark history viewer — see every team that played at a given stadium

All of these query the same graph. No additional data pipeline, no additional ETL. Just different queries and a different UI."

---

## WHAT WE BUILT AND WHY IT MATTERS

"Let me close by reflecting on what this series actually demonstrated — beyond the baseball specifics.

We took a large, messy, publicly available dataset and turned it into structured, decentralized, open knowledge. That process has three phases that apply to any domain, not just baseball:

**Phase 1: Understand the data.** We used Claude to explore 14 different data files, categorize fields, and identify what entities and relations are implied by the structure.

**Phase 2: Design the ontology.** We made principled decisions about types, properties, data types, and the use of relations over text. Those decisions determined what queries are possible — you can't query what you didn't model.

**Phase 3: Publish and build.** We wrote idempotent, safe publishing scripts, verified the graph in the browser, and then built an app that queries it directly. The entire stack — from raw data to working app — was done with Claude as the primary coding assistant, with a human in the loop making design decisions.

The result is not a private database. It's a public good. Anyone can query it, anyone can build on it, anyone can extend it. That's what decentralized knowledge infrastructure means in practice."

---

## SERIES WRAP-UP

"That's the series. Seven videos, one complete baseball knowledge graph.

If you want to go deeper:
- The full repo is linked in the description — every script, every doc, every prompt
- The Geo browser lets you explore the published graph directly — search for Player, Game, or any entity type in the baseball space
- The docs folder in the repo has the SDK patterns, GraphQL API reference, and ontology rules if you want to build your own space

If you build something on this graph — an app, an enrichment, a different data layer — I'd genuinely love to see it. Drop a link in the comments or reach out directly.

Thanks for watching."

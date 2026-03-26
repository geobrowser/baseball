# Content Plan: Baseball x Geo Knowledge Graph

A content stream documenting the process of building a decentralized baseball knowledge graph — from raw data to published ontology on the Geo protocol.

## Narrative Arc

The overall story follows the data pipeline journey:

1. **The Problem** — Baseball data is scattered, siloed, and locked behind proprietary APIs
2. **The Vision** — What if all of baseball history lived in an open, structured, decentralized knowledge graph?
3. **The Data** — Sourcing from Retrosheet (historical). Live MLB Stats API data is a future iteration.
4. **The Ontology** — Designing a schema that models baseball as a graph of relationships
5. **The Pipeline** — Building the tools to transform and publish
6. **The Graph** — What it looks like when it's live and queryable
7. **The Future** — What becomes possible (analytics, apps, community contributions)

---

## Phase 1: Setup & Data Discovery (Completed)

### Post 1 — "Why Baseball Needs a Knowledge Graph"
**Format:** Long post / blog
**Platform:** X, Mirror, Geo
**Key points:**
- Baseball has the richest statistical history of any sport — 150+ years, 16M+ records
- But the data is fragmented: Retrosheet (historical, free, text files), MLB API (live, JSON, undocumented), Baseball Savant (Statcast, CSVs), Baseball Reference (web scraping)
- None of these talk to each other natively. Player IDs don't match across sources. There's no unified schema.
- A knowledge graph changes this — entities (players, games, teams) connected by typed relations, queryable across the entire history
- Geo makes it decentralized and permissionless — anyone can contribute, verify, and build on top

**Draft hook:** "Baseball has more data than any sport in history. It's also one of the most fragmented. What if we fixed that?"

### Tweet Thread 1 — "Data sourcing for the baseball knowledge graph"
**Format:** 5-7 tweet thread
**Platform:** X
**Content:**
1. Starting a project to put all of baseball history into a decentralized knowledge graph on @geobrowser
2. Two main data sources: Retrosheet (historical, back to 1871) and MLB Stats API (live, with Statcast pitch data since 2015)
3. Retrosheet gives us 16M+ records — every game, every at-bat, every player bio. But it's pipe-delimited text files from the 90s.
4. MLB Stats API goes back to 1901 for schedules but the real gold is Statcast: pitch velocity, spin rate, exit velocity, launch angle. 300+ data points per game.
5. The challenge: different IDs, different formats, different coverage windows. Retrosheet uses "ohtas001", MLB uses 660271. Same guy (Ohtani).
6. Built a fetch script that pulls live game data — schedule, play-by-play, boxscores — into structured JSON. 933 plays across 13 games in one day.
7. Next up: designing the ontology that maps all of this into a unified knowledge graph. Stay tuned.

**Attach:** Screenshot of the fetch script running, showing game scores

### Tweet 2 — Stat comparison visual
**Format:** Single tweet with image
**Platform:** X
**Content:** "Retrosheet vs MLB Stats API coverage — same sport, very different data" + comparison table image showing what each source has that the other doesn't

---

## Phase 2: Ontology Design (Completed)

### Post 2 — "Designing a Baseball Ontology for a Decentralized Knowledge Graph"
**Format:** Long post / blog
**Platform:** X, Mirror, Geo
**Key points:**
- What is an ontology? Types (Person, Game, Play) and Properties (Hits, RBI, Venue) that define how data is structured
- Design decisions we made and why:
  - Relations over text — City, League, Position are entities, not strings. "Find all players born in Japan" becomes a graph traversal, not a text search.
  - Boolean simplicity — Day Game is true/false, not a "Time of Day" entity with 2 instances
  - Baseball notation — Innings Pitched as Float64 in base-3 convention (6.2 = 6 and 2/3)
  - Granularity — Play (at-bat level) vs Pitch (individual throw). One at-bat can have 10 pitches. Different entities.
- 27 types, 96 new properties, 15 reference entity types (Position, Handedness, Pitch Type, etc.)
- The entity relationship diagram showing how everything connects
- Reusable properties: "Strikeouts" is one property used by both Batting Performance and Pitching Performance

**Draft hook:** "How do you model 150 years of baseball in a knowledge graph? You start with types and relations."

### Video 1 — "Building a Baseball Knowledge Graph: Ontology Design"
**Format:** 5-10 min screencast / walkthrough
**Platform:** YouTube, X
**Outline:**
- Quick intro: what we're building and why
- Screen share: walk through ontology.txt showing the type hierarchy
- Explain the relation-over-text philosophy with City/State/Country example
- Show the entity relationship diagram
- Show ontology.json with the stable IDs
- Preview: next we publish this schema to the graph

### Tweet Thread 2 — "Ontology design decisions"
**Format:** 4-5 tweet thread
**Platform:** X
**Content:**
1. Spent the week designing a baseball ontology for @geobrowser. 27 entity types, 96 properties, covering everything from 1871 box scores to 2025 Statcast pitch data.
2. Key insight: relations > text. "City" isn't a string on a player — it's an entity. Cincinnati the city connects to Ohio the state connects to USA. Now "find all players born in Japan" is a graph query.
3. Baseball has weird data types. Innings Pitched looks like a decimal but it's actually base-3. "6.2" means 6 and 2/3 innings, not 6.2. We store it as Float64 with a description explaining the convention.
4. One Play (at-bat) can contain 10+ Pitches. Different granularity = different types. The Pitch type has Statcast fields (velocity, spin, launch angle) that only exist since 2015.
5. Full ontology is open source. Next step: publishing the schema to Geo testnet and starting to populate it with data.

---

## Phase 3: Schema Publishing (Re-doing on camera)

### Tweet 3 — "Schema is live"
**Format:** Single tweet
**Platform:** X
**Content:** "Just published 21 new types and 96 properties to @geobrowser testnet for the baseball knowledge graph. Every pitch, every play, every player — structured and queryable." + screenshot of types in the Geo browser

### Post 3 — "Publishing a Knowledge Graph Schema with GRC-20"
**Format:** Long post / tutorial
**Platform:** X, Mirror, Geo
**Key points:**
- How GRC-20 types and properties work (entities in the graph, not a separate schema layer)
- Using Graph.createType() and Graph.createProperty() from the Geo SDK
- Checking what already exists via GraphQL before creating (6 types already existed: Person, Team, City, State, Country, Role)
- Generating stable entity IDs with IdUtils.generate() and storing them in ontology.json
- The publish script: reading the JSON, creating ops, publishing to testnet
- How the schema shows up in the Geo browser

---

## Phase 4: Data Population (Upcoming)

### Video 2 — "Populating the Graph: From CSV to Knowledge Graph"
**Format:** 10-15 min screencast
**Platform:** YouTube, X
**Outline:**
- Start with the parsed data (show data_samples.txt — the 14 files, 9.6 GB)
- Walk through the field-mappings.md showing how source fields map to ontology properties
- Build the publish script for reference entities first (small sets: Handedness, Position, League)
- Then teams, then players
- Show entities appearing in the Geo browser as they publish
- Discuss batching and performance for large datasets

### Tweet Thread 3 — "Populating the graph"
**Format:** 5-6 tweet thread
**Platform:** X
**Content:**
1. Started populating the baseball knowledge graph. First up: reference entities — the building blocks everything else points to.
2. 3 Handedness entities (Left, Right, Switch). 11 Positions (Pitcher through DH). 4 Roles (Player, Manager, Coach, Umpire). Small but critical — every player entity will reference these.
3. 293 teams next. From the 2025 Yankees to the 1916 Atlantic City Bacharach Giants. Each with City, League, and Nickname relations.
4. Then 27,000 players. Each one connected to their birth city, handedness, roles, and career dates. The graph starts to feel alive.
5. Now games. 237,000 of them, each connecting Home Team, Away Team, Venue, Season, and 10+ pitcher/manager/umpire relations.
6. The play-by-play layer is where it gets wild: 6.5M plays, each with Batter, Pitcher, Event, and baserunner state. Plus 300+ pitches per game with Statcast data since 2015.

### Post 4 — "Live Data: Connecting the MLB Stats API to a Knowledge Graph"
**Format:** Long post
**Platform:** X, Mirror, Geo
**Key points:**
- The fetch_mlb_live.ts script: pulling schedule, play-by-play, and boxscores
- Statcast data: what it is and why it matters (pitch velocity, spin rate, exit velocity)
- Data availability by era: nothing before 1950, basic plays 1950-2007, PITCHf/x 2008-2014, full Statcast 2015+
- The merge strategy: MLB API primary for current data, Retrosheet backfill for historical depth
- Cross-referencing player IDs between sources using the Chadwick Bureau register

---

## Phase 5: Queries & Insights (Future)

### Video 3 — "Querying 150 Years of Baseball"
**Format:** 5-10 min screencast
**Platform:** YouTube, X
**Outline:**
- Show the populated graph in the Geo browser
- Run example queries:
  - "All players born in Japan who hit 40+ home runs in a season"
  - "Every no-hitter thrown at Fenway Park"
  - "Pitch velocity trends by year since 2015"
  - "Games where the winning pitcher also hit a home run"
- Discuss what becomes possible with graph traversal that's hard with flat data

### Post 5 — "What a Decentralized Baseball Knowledge Graph Enables"
**Format:** Long post / vision piece
**Platform:** X, Mirror, Geo
**Key points:**
- Open data: anyone can query, build on, or contribute to the graph
- Cross-source joins: Retrosheet historical depth + MLB Statcast richness in one queryable graph
- Community curation: Negro League data, minor leagues, international baseball — anyone can add spaces
- Applications: fantasy tools, historical analysis, broadcasting graphics, educational resources
- The bigger picture: if we can do this for baseball (the most data-rich sport), we can do it for anything

### Tweet Thread 4 — "What's next"
**Format:** 3-4 tweets
**Platform:** X
**Content:**
1. The baseball knowledge graph is live on @geobrowser testnet. 150+ years of data, structured and queryable. But this is just the beginning.
2. Next: live data pipeline (auto-ingest each day's games), minor league data, international leagues, and opening it up for community contributions.
3. If you're interested in baseball data, knowledge graphs, or decentralized data — the repo is open source. Come build with us.

---

## Recurring / Ongoing Content

### "Today in Baseball History" series
**Format:** Daily tweet
**Platform:** X
**Content:** Pull a notable game/event from the graph for today's date. Link to the entity in the Geo browser.
**Example:** "On this day in 1974, Hank Aaron hit home run #715 to pass Babe Ruth. See the play in the knowledge graph: [link]"

### "Stat of the Week" series
**Format:** Weekly tweet with visual
**Platform:** X
**Content:** Surface an interesting stat or query from the graph. Make it visual.
**Examples:**
- "Average pitch velocity by pitch type, 2015-2025" (graph from Pitch entities)
- "Most ejections by team, all time" (from Ejection entities)
- "Players who played all 9 positions in their career" (from Fielding Performance)

### Build log updates
**Format:** Short posts / threads
**Platform:** X
**Content:** Progress updates as we hit milestones (X entities published, new data source added, etc.)

---

## Content Calendar (Suggested Cadence)

| Week | Content | Status |
|------|---------|--------|
| 1 | Post 1 (Why Baseball Needs a KG) + Tweet Thread 1 (Data sourcing) | Ready to write |
| 2 | Post 2 (Ontology Design) + Video 1 (Ontology walkthrough) + Tweet Thread 2 | Recording on camera |
| 3 | Schema publishing + Tweet 3 (Schema is live) + Post 3 (Publishing tutorial) | Recording on camera |
| 4 | Video 2 (Populating the graph) + Tweet Thread 3 (Population progress) | After data publish starts |
| 5 | Post 4 (Live data pipeline) | Future iteration — MLB API deferred |
| 6+ | Queries & insights content, recurring series | After graph is populated |

---

## Assets Needed

- Screenshots of the Geo browser showing entities and relations
- Entity relationship diagram (clean version of the ASCII art in ontology.txt)
- Comparison tables (Retrosheet vs MLB API, data coverage by era)
- Terminal screenshots of scripts running
- Query result visualizations
- Project logo / banner image

# Baseball × Geo — Walkthrough Plan

## Phase 0 — Project Introduction & Data

**Goal:** Set context, explain the data source, and orient viewers to the repo.

- Introduce the project: why baseball + knowledge graphs, why Geo protocol
- Retrosheet disclosure: data is free to use, copyrighted by Retrosheet
  - Historical data only (1871–2025) for this iteration; live MLB data is a future addition
- Walk through what was already done: all Retrosheet data downloaded and parsed
  - Show `scripts/download_retrosheet.ts` — how the download works, what groups were fetched
  - Show `scripts/parse_*.ts` scripts — how each file format was handled
  - Run `scripts/summarize_data.ts` to show the full inventory: 14 files, 9.6 GB
- Introduce the Geo protocol briefly: entities, types, properties (values and relations), spaces
  - Reference `knowledge-graph-ontology.md` and `spec.md` as background reading

---

## Phase 1 — Data Exploration

**Goal:** Understand what's in the data before designing anything.

- Walk through `data_samples.txt` — 14 files, field-by-field examples
  - Players: bios, handedness, Hall of Fame, career dates
  - Teams: franchises, leagues, cities, years active
  - Ballparks: names, locations, aliases, active date ranges
  - Rosters: year-by-year player/team entries
  - Gamelogs: 161 fields per game — attendance, scores, umpires, managers, pitchers
  - Plays: 159 columns — batter, pitcher, event, baserunner state, 80+ outcome fields
  - Batting / Pitching / Fielding: per-game performance stats
  - Schedules: scheduled and actual game results
  - Ejections: who, when, inning, reason
  - Special collections: notable games (no-hitters, etc.)
- Use `01_api_demo.ts` to explore the Geo API
  - Query types and properties in the root space
  - Understand the difference between values and relations
  - See what types already exist (Person, City, State, Country, Role, Team)
- Identify natural entity types, reference data, and relation candidates
- **Output:** Write `data_exploration_notes.txt` summarizing key findings

---

## Phase 2 — Ontology Design

**Goal:** Design the full type system, properties, and relation structure for baseball data on Geo.

### 2a — Initial proposal
- Have Claude propose entity types and properties based on the data exploration
- Discuss: what are the top-level entities vs reference entities?
  - Top-level: Player, Team, Ballpark, Season, Game, Play, Batting performance, Pitching performance, Fielding performance, Ejection, Roster entry
  - Reference: League, Position, Handedness, Role, Game type, Pitch type, Pitch call, Hit trajectory, Fielding position

### 2b — Design principles
- **Relations over text:** City, State, Country, League, Position, Handedness are entities — not strings
  - Enables graph traversal: "all players born in Japan"
- **Reuse properties:** "Strikeouts" is one property shared by Batting performance and Pitching performance
- **Appropriate data types:**
  - Float64 for decimals (ERA, batting average, innings pitched in base-3 convention)
  - Boolean for binary choices (day game, top of inning, game started, save)
  - Integer for counting stats and coded values
  - Text only for free-form strings (descriptions, unique IDs, wind descriptions)
- **One entity per observation:** batting/pitching/fielding are per-player per-game, not aggregated
- **Name conventions:** First letter of first word only; acronyms stay ALL-CAPS (RBI, ERA, MLB)
- Review `archive/ontology_rules_reference.md` for full rule set established previously

### 2c — Create `ontology.txt`
- Write human-readable ontology design doc covering:
  - All type definitions with descriptions
  - All properties with data types, descriptions, and where applicable, what entity types they point to
  - Entity relationship diagram
  - Naming convention rules
- Iterate on the draft: refine types, consolidate duplicate properties, fix naming

### 2d — Create `src/ontology.json`
- Machine-readable version with stable entity IDs (generated via `IdUtils.generate()`, set once)
- Structure: `types`, `properties`, `type_schemas`, with `existing: true` flags for system entities
- Rename any fields to match Geo SDK conventions (`toEntityTypes`, etc.)
- Add descriptions to all types and properties

### 2e — Create `docs/field-mappings.md`
- Field-level mapping: source file + field → ontology property
- Covers all 14 parsed files
- Essential reference for writing publish scripts

### 2f — Create `docs/ontology-rules.md`
- Codify all design decisions: naming, data types, entity modeling patterns, dedup strategy
- Should be referenced before making any additions or changes to the ontology

---

## Phase 3 — Publishing the Ontology

**Goal:** Publish all new types and properties to the Geo testnet.

- Check the GraphQL API first: some types already exist in the root space (Person, City, State, Country, Role, Team)
  - Mark these as `existing: true` in `ontology.json`
- Write `08_publish_ontology.ts`:
  - Reads `src/ontology.json`
  - Checks API for already-published entities (idempotent)
  - Creates properties first (types reference property IDs)
  - Creates types with their property schemas
  - Supports `--dry-run` and `--force` flags
- Run with `--dry-run` to preview
- Publish and verify in the Geo browser
- **Key principle:** Running the script twice should never create duplicates

---

## Phase 4 — Publishing Test Entities

**Goal:** Publish a representative sample of data to test the ontology in practice.

- Publish in dependency order:
  1. Reference entities (Handedness, Position, Game type, Role, League) — small, finite sets
  2. Cities, States, Countries (for player birthplaces and team home cities)
  3. Teams (293 franchises)
  4. Players (sample of 10–20 notable players)
  5. Ballparks
  6. A single Season
  7. A single Game with full context
  8. Plays, Batting/Pitching/Fielding performances for that game
- Write `09_publish_test_entities.ts` with deduplication:
  - Before creating any entity, check API: Retrosheet ID → MLB ID → name+type
  - Reuse existing entity IDs if found (upsert, no duplicates)
  - Helpers: `findEntityByTextValue()`, `findEntityByName()` from `src/functions.ts`
- Review published entities in the Geo browser
  - Navigate relations between entities
  - Verify property values match source data
- Identify issues and iterate on the ontology if needed

---

## Phase 5 — Ontology Iteration

**Goal:** Improve the ontology based on what you see in the browser.

- Add descriptions to key entities if missing
- Enrich entities with data blocks where useful:
  - Play entity: pitch-by-pitch data block (if pitch data available)
  - Game entity: plays data block, batting/pitching/fielding performance tabs
- Consider data block filter structures and property ordering
- Update `ontology.txt` and `src/ontology.json` with any changes
- Re-run ontology publish for any new properties/types
- Re-run test entity publish for affected entities

---

## Phase 6 — Bulk Data Publishing

**Goal:** Publish the full dataset (or a meaningful subset like a single season) to Geo.

- Define scope: start with 2024 season for a manageable initial dataset
- Plan batch publishing strategy:
  - Process in chunks (e.g., 100 entities per publish call)
  - Idempotency: check for existing entities before creating
  - Error handling: retry logic, progress logging
- Write bulk publish scripts per entity type
- Publish reference entities → teams → players → ballparks → seasons → games → performances → plays
- Monitor publish progress, handle rate limits and errors

---

## Phase 7 — Application Development

**Goal:** Build a web app on top of the published knowledge graph.

- Define app functionality (options to explore):
  - Virtual Hall of Fame: browse players, career stats, historical context
  - Game explorer: navigate play-by-play, pitcher vs batter matchups
  - Fantasy research: filter players by stats, position, era
  - "Today in baseball history" — pull a notable game from this date
- One-shot app build with Claude using the Geo GraphQL API
- Test and iterate
- Discuss: what becomes possible with a queryable open knowledge graph that isn't possible with flat data

---

## Phase 8 — Future Directions

- **Live data:** MLB Stats API integration (Statcast pitch data, current season)
  - Map Retrosheet IDs to MLB player IDs using the Chadwick Bureau register
  - Legal note: MLB data is proprietary — commercial use requires a license
- **Data enrichment:** Images, richer descriptions, community contributions
  - Potential bounties for adding player photos, Negro League data, international leagues
- **Additional use cases:**
  - Training data for prediction market bots (e.g., Polymarket baseball markets)
  - Minor league data
  - Cross-referencing with other open sports data sources

---

## Content Milestones (see `content/content-plan.md`)

| Phase | Content |
|-------|---------|
| 0 | Post: "Why baseball needs a knowledge graph" + Tweet thread on data sourcing |
| 2 | Post: "Designing a baseball ontology" + Video: ontology design walkthrough |
| 3 | Tweet: "Schema is live" + Post: publishing tutorial |
| 4–5 | Video: populating the graph + Tweet thread on progress |
| 7 | Demo video: querying and app walkthrough |

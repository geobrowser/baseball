---
name: Ontology design rules
description: Established conventions for designing types, properties, and naming in the Geo knowledge graph ontology
type: feedback
---

## Data type selection

- **Relations over text, always.** If a value comes from a finite/categorical set that will be reused across entities, model it as a Relation to a reference entity — even for sets as small as 2-3 values (e.g., Surface Type: "Grass"/"Artificial Turf"). Text is only for truly free-form data (descriptions, unique identifiers, natural-language strings like wind descriptions).

- **Text** — Only for unique-per-entity identifiers (Retrosheet ID, nicknames), free-form descriptions, or genuinely unbounded strings (wind, ejection reasons).

- **Boolean** — For binary choices where creating two reference entities would be overkill (e.g., Day Game: true/false, Top of Inning: true/false). Don't use for categorical data with more than 2 values.

- **Float64** — For measurements with decimal precision: temperature, velocities, angles, distances, and baseball innings notation (6.2 = 6⅔ innings in base-3 convention).

- **Integer** — For counting stats (hits, runs, errors), whole-number metadata (attendance, capacity, year), and coded values (strike zone regions 1-14).

- **Date** — For calendar dates (birth date, game date, start/end dates). Use RFC 3339 format.

- **Point** — For geographic coordinates (venue lat/long). Use the existing "Geo location" property with Renderable type: Geo location.

## Naming conventions

- **Title case** — First letter of the first word capitalized: "Batting performance", "Home plate umpire", "Grounded into double play". Unless it is a acronym, name, or otherwise should be capitalized.

- **Minor words lowercase** — Prepositions and articles stay lowercase in middle position: "Runner on 1B", "Top of inning", "Hit by pitch".

- **Acronyms stay all-caps** — RBI, MLB, ID, URL, PK, 1B, 2B, 3B.

- **Parenthetical units capitalized** — "Height (inches)", "Weight (lbs)", "Duration (minutes)", "Game length (outs)".

- **Existing properties keep their casing** — Don't rename already-published properties (e.g., "Birth date", "Geo location" stay as-is).

- **Boolean names** — Use positive phrasing without "Is" prefix for official stats: "Day game", "Game started", "Complete game", "Shutout", "Win", "Loss", "Save". Use "Is" prefix for state descriptions: "Is scoring play", "Is designated hitter".

- **Play description → system Name** — Use the system Name property for the natural label (e.g., "Ohtani vs Cole — Home Run" for plays). Use system Description for longer natural-language text. Avoid creating custom text properties when a system property works.

## Entity modeling

- **One entity per observation** — Batting/Pitching/Fielding performance are one entity per player per game (not aggregated seasons). Plays are one per at-bat. Pitches (if available) are one per individual throw.

- **Reference entities** — Small finite sets (Handedness, Position, Role, Game Type, etc.) are created once and referenced everywhere via relations. These are lightweight entities with just Name/Description.

- **Reuse properties across types** — Define a property once (e.g., "Strikeouts", "RBI", "Team") and attach it to multiple type schemas rather than creating type-specific duplicates.

- **Geographic chain** — City → State → Country as a relation chain. City entities have State and Country relations. This enables traversal queries ("all players born in Japan").

- **Different granularity = different type** — Play (at-bat level, ~70-80 per game) and Pitch (individual throw, ~300 per game) are separate types because they represent different levels of detail. Don't merge types that have 1:many relationships.

## Existing entity awareness

- Always query the GraphQL API before creating types/properties to check what already exists in the space. Mark existing entities with `"existing": true` in ontology.json so publish scripts skip them.

## Entity deduplication (lookup before create)

- **Always check for existing entities before creating new ones.** This prevents duplicates when scripts are re-run or when multiple sources contribute the same entity.
- Lookup priority (in order of reliability):
  1. **Retrosheet ID** — unique text property, most reliable for historical data
  2. **MLB ID** — unique integer property, most reliable for live API data
  3. **Name + type** — fallback for reference entities (Position, League, Handedness, etc.)
- Helper functions in `src/functions.ts`: `findEntityByTextValue()`, `findEntityByIntegerValue()`, `findEntityByName()`, `findEntityById()`
- If a match is found, reuse the existing entity ID. `Graph.createEntity()` with an existing ID upserts (updates values without duplicating).
- For reference entities (small finite sets), name + type match is sufficient since names are unique within a type.
- For domain entities (Person, Team, Game), use identifier-based lookup since names can collide (multiple "John Smith" players).

# Video 4: Publishing Test Entities to the Baseball Knowledge Graph

---

## INTRO

"Welcome back. In the last video, we published our baseball ontology to the Geo testnet — the full type system and property schema is live and queryable.

Today we start populating the graph with actual data. We're going to publish a representative set of real entities: reference data, geographic entities, teams, players, a ballpark, a season, and one complete game with every performance stat and play.

The goal isn't to publish the full dataset yet — that's a later video. Today is about testing the ontology in practice. Once we have real entities in the graph and can navigate them in the browser, we'll see whether our design decisions actually hold up."

---

## THE PUBLISH ORDER

"Before we write the script, let me explain why publish order matters here.

Entities on Geo can have relations to other entities. A Player entity has a relation to a City entity for their birthplace. A Game entity has relations to two Team entities. A Batting performance has a relation to both a Player and a Game.

If we try to create a Player before the City entity for their birthplace exists, that relation can't be set — the target doesn't exist yet. So we always publish in dependency order: reference data first, then the entities that reference it.

The order is:
1. Reference entities — Handedness, Position, Role, Game type, League. Small finite sets, no dependencies.
2. Geographic entities — Country, State, City. Used by player birthplaces and team home cities.
3. Teams
4. Players — depend on City, Handedness, Position
5. Ballparks — depend on City
6. A Season
7. One Game — depends on Teams, Ballpark, Season, and individual Player relations for pitchers, umpires, managers
8. Plays, Batting performances, Pitching performances, Fielding performances — all depend on the Game and Players"

---

## PROMPT 17 — WRITING 09_PUBLISH_TEST_ENTITIES.TS

[Use Claude — Prompt 17 from walkthrough_prompts.txt]

[Show the prompt being pasted into Claude]

"This is a large script so I want to walk through what I've asked Claude to build before we look at the output.

**Deduplication first.** Before creating any entity, the script checks the API. For most entities it checks by Retrosheet ID — a text property we store on the entity. If it finds a match, it reuses the existing entity ID instead of creating a duplicate. For entities without a Retrosheet ID it falls back to name + type matching.

**Multi-space entities.** This is an important pattern. If we find a match for an entity in a different Geo space — say, a City entity for Boston that someone else already published — we create our entity at the same ID. That makes it a multi-space entity: one node in the graph, visible from multiple spaces. Any enrichment anyone adds to that Boston entity becomes part of our graph too.

**Source data.** I'm using 2024 season data. The scripts read directly from data/parsed/ — the NDJSON files we produced in Video 1. I'm asking Claude to use the field-mappings.md we wrote in Video 2 to know how each source field maps to an ontology property.

**Import order is enforced.** The script publishes each group, collects the resulting entity IDs, and passes them as context to the next group. Player entities reference the City IDs we just created. Game entities reference the Team IDs we just created."

[Show Claude writing 09_publish_test_entities.ts — this takes a while]

"While that's generating, let me open the Retrosheet parsed data for the 2024 season to show what we're working from."

[Open a sample from data/parsed/ — gamelogs or players]

"Each row is a JSON object with all the fields from data_samples.txt. The publish script will read these, map the fields to our ontology properties, and create entities."

[Show the completed script — walk through key sections]

"Walk through:
- The reference entity section — creating the fixed Handedness values: Left, Right, Switch
- The player section — how it reads from the biographical register, checks for existing entities, and sets the Birth city relation
- The game section — how it assembles all the relations: home team, away team, ballpark, season, pitchers, umpires
- The deduplication helper at the top"

---

## PROMPT 18 — PUBLISHING TEST ENTITIES

[Use Claude — Prompt 18 from walkthrough_prompts.txt]

[Run: `bun run 09_publish_test_entities.ts` in terminal]

"Let's run it. You'll see it working through the publish order — reference entities first, then geography, then teams, then players."

[Show the terminal output scrolling — created/skipped/reused log lines]

"A few things to watch for in the output:
- 'Reusing existing entity' means we found a match in the API and are pointing to it
- 'Creating multi-space entity at ID ...' means we found a match in another space and are publishing at the same ID
- 'Created' means it's brand new to the graph

The plays and performance stats at the end will be the longest batch — a full 9-inning game has 60-80 plays and 20-30 performance records."

[Show the final summary — total entities created, skipped, reused]

---

## EXPLORING THE GRAPH IN THE BROWSER

[Switch to Geo browser]

"Now the good part. Let's navigate the graph and see if the ontology actually works."

**Player entity**

[Navigate to a notable player — e.g., a well-known 2024 player]

"Here's a player entity. You can see the property values: birth date, debut date, height, weight, Hall of Fame status. And the relations — birth city links to a City entity, which links to a State, which links to a Country. Let me click through that chain."

[Click City → State → Country]

"That's the geographic chain working. One player entity connected to the full geographic hierarchy. If someone else on Geo publishes a different dataset that also references this City entity, the connections just work — no joins, no foreign keys, just graph traversal."

**Team entity**

[Navigate to a team]

"Team entity — league relation, home city relation, years active. Let me click the League relation."

[Click through to League entity]

"The League entity exists as its own node. Every team in the American League points here. Every game in the American League points here through its teams. That's queryable."

**Game entity**

[Navigate to the game entity]

"This is where it gets interesting. A single game entity with relations to both teams, the ballpark, the season, the home and away managers, the home and away starting pitchers, the plate umpire. All clickable.

Let me check the score and game length — those are value properties, not relations."

[Show the property values: visiting score, home score, game length in outs, day game boolean, attendance]

"Day game is a boolean — false here, so it was a night game. Game length in outs — 27, a clean nine-inning game.

Now let me navigate to the batting performances."

**Batting performance entity**

[Navigate to a batting performance for one of the players in the game]

"This batting performance entity is scoped to one player in one game. It has a relation to the Player entity, a relation to the Game entity, and then all the counting stats: at-bats, hits, home runs, RBI, strikeouts, walks.

This is the 'one entity per observation' pattern from our ontology rules. We're not aggregating stats here — every game is a separate performance record. That means you can query career totals by aggregating across all a player's performance entities, or you can look at a single game in isolation."

**Play entity**

[Navigate to one play from the game]

"And here's a play entity. Inning, top or bottom, batter, pitcher, base state before the play, event type, outcome flags. This is the most granular data in the dataset — every pitch sequence, every baserunner movement, every scoring play.

The event type is a relation to a hit trajectory entity — so 'fly ball' is not a string, it's an entity that every fly ball play points to."

---

## PROMPT 19 — REVIEW AND ITERATE

[Use Claude — Prompt 19 from walkthrough_prompts.txt]

"Now that I've browsed the entities, let me think about what I want to fix before we publish at scale.

[Note: fill in actual feedback from browsing before recording this section. Common things to catch:]

- A property that's showing up in the wrong place or with the wrong data type
- A relation that should exist but is missing
- Naming that looks awkward in the browser UI
- Reference entities that are missing (e.g., a game type value we didn't anticipate)

I'll share my feedback with Claude and we'll iterate."

[Show Claude's response — specific fixes to ontology.json or the publish script]

"For any ontology changes — new properties, corrected data types — we'd re-run the publish ontology script to push those updates. For publish script fixes, we adjust and re-run the test entities script. The idempotency logic means re-running is safe — it skips what already exists and only creates what's new."

---

## WRAP-UP

"That's Video 4. We've gone from a schema on chain to actual entities in the graph — reference data, teams, players, a ballpark, a season, and a complete game down to the play-by-play level.

And more importantly, we've navigated the graph in the browser and confirmed that the ontology holds up. The relations work. The geographic chain is traversable. The performance stats are correctly scoped per player per game.

In the next video, we'll do bulk publishing — scaling from one test game to the full 2024 season. Thousands of games, hundreds of players, millions of plays.

Repo link is in the description. See you next time."

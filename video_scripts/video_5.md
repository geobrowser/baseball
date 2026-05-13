# Video 5: Data Blocks and Bulk Publishing

---

## INTRO

"Welcome back. Last video we published a full test slice of the graph — reference entities, teams, players, a ballpark, a season, and one complete game down to the play level. We navigated it in the browser and confirmed the ontology holds up.

Today has two parts.

First, we're going to enrich the game entity with data blocks — structured views that surface related data right on the entity page. Plays, batting performances, pitching performances, fielding performances, all as navigable tabs.

Then we're going to scale up. We'll plan and write the bulk publishing scripts for the full 2024 season — thousands of games, hundreds of players, millions of plays. That's what turns a proof of concept into a real knowledge graph."

---

## PART 1: DATA BLOCKS

### What Are Data Blocks?

"Before we write anything, let me explain what a data block is in Geo.

An entity page in the Geo browser can have blocks attached to it — think of them like embedded views. A data block is a filtered, sorted list of related entities displayed inline on the page. So instead of navigating away from a Game entity to find its plays, you see a Plays tab right there on the game page.

Data blocks are configured with:
- An entity type to display — Play, Batting performance, etc.
- A filter that scopes the results — in this case, plays where the game relation equals this game
- An optional sort — by inning, by player name
- Which properties to show as columns

They're defined as ops, just like any other entity data. We publish them the same way."

---

### PROMPT 20 — ADDING DATA BLOCKS TO GAMES

[Use Claude — Prompt 20 from walkthrough_prompts.txt]

[Show the prompt, reference to 02_publish_demo.ts as the pattern source]

"I'm asking Claude to enrich our published game entity with four data block tabs:

- **Plays** — all plays in the game, filterable by team, sorted by inning
- **Batting performances** — home and away split into separate blocks
- **Pitching performances**
- **Fielding performances**

The key detail in each block is the filter. A play data block on a Game entity needs a filter that says: show Play entities where the 'Game' relation equals this game's ID. Otherwise you'd see every play in the entire space.

I'm having Claude write either an update to 09_publish_test_entities.ts or a separate enrichment script — whichever makes more sense given the size."

[Show Claude writing the script — focus on the data block filter configuration]

"Let me highlight the filter setup. Each block has a filter object that references:
- The space ID — scopes to our baseball space
- The entity type — Play, Batting performance, etc.
- The relation filter — game relation equals our specific game ID

This is what makes the data block show the right data. Without the game filter, every game's plays would bleed into every other game's plays block."

---

### PROMPT 21 — VERIFY DATA BLOCKS IN BROWSER

[Run the enrichment script in terminal]

[Switch to Geo browser — navigate to the game entity]

"Let's see it. I'll open the game entity and look for the new tabs."

[Show the game entity page with tabs visible — Plays, Batting, Pitching, Fielding]

"There are the tabs. Let me open Plays first."

[Click Plays tab — show the list of play entities with inning, batter, pitcher, event type columns]

"You can see every play in the game sorted by inning — at-bats, walks, strikeouts, baserunner events. Each row is a clickable Play entity. Let me click one and navigate to the full play record."

[Click a play — show the full play entity with all its properties]

"Now let me go back and check the batting performances tab."

[Click Batting performances — show the split by home/away]

"Home and away batting are separate blocks — so you can see each team's performance side by side. Each row is a Batting performance entity for one player in this game. Hits, at-bats, home runs, RBI, all as typed properties."

[Show pitching and fielding tabs briefly]

"Pitching and fielding look good too. This is what a game entity looks like fully enriched."

---

## PART 2: BULK PUBLISHING

### The Scale Problem

"We have one game in the graph. The 2024 MLB season had 2,430 regular season games. Each game has 60–80 plays, 20–30 batting performances, 20–30 pitching performances, 20–30 fielding performances. Do the math and you're looking at:

- ~2,430 games
- ~150,000–200,000 plays
- ~60,000–90,000 batting performances
- Similar numbers for pitching and fielding

That's somewhere between 300,000 and 400,000 new entities for just the 2024 season. Publishing that naively — one entity at a time — would take hours and hit rate limits immediately.

We need a batch publishing strategy."

---

### PROMPT 22 — PLAN THE APPROACH

[Use Claude — Prompt 22 from walkthrough_prompts.txt]

[Show the prompt]

"Before writing a single line of code, I want Claude to help me think through the strategy. Three things:

1. Estimate the total entity count for the 2024 season so we know what we're dealing with
2. Design a batch publishing strategy — chunk sizes, idempotency, rate limiting, progress tracking
3. Sketch what the script structure looks like

We're not writing code yet, just planning."

[Show Claude's response]

"Walk through the key decisions from Claude's plan:

**Chunk size.** Publishing ~50 entities per transaction is a reasonable balance between throughput and transaction size. Too large and the transactions get unwieldy; too small and you're making thousands of API calls.

**Idempotency.** Every entity gets checked by Retrosheet ID before creation. If the script crashes mid-run and we restart, it picks up where it left off — no duplicates, no wasted work. This is critical at this scale.

**Progress logging.** We'll write a progress file tracking how many entities have been published per type. If the run fails at game 800, we restart from game 801.

**Dependency order.** Same as test entities: reference data → geography → teams → players → ballparks → season → games → plays and performances. But now at scale — the players and teams for the full 2024 roster, all 30 teams' full game schedules."

---

### PROMPT 23 — WRITING THE BULK PUBLISH SCRIPTS

[Use Claude — Prompt 23 from walkthrough_prompts.txt]

[Show the prompt]

"Now we write it. I'm asking Claude to start with the foundational script: teams and players for the 2024 season. Once that works we'll move to games and performances.

The requirements:
- Read from data/parsed/ — the full NDJSON files, not the small samples we used for test entities
- Batch in chunks of ~50 entities per publishOps() call
- Check by Retrosheet ID before creating (idempotency)
- Log progress to the terminal with counts and a running total
- Support resuming from a checkpoint if interrupted"

[Show Claude writing the bulk teams/players script]

"Walk through the structure:

- It opens the players NDJSON file as a stream — we don't want to load 9 GB into memory at once, we process it line by line
- Each player is checked against the API using their Retrosheet ID
- New players get queued into a batch
- When the batch hits 50, we call publishOps() and flush it
- Progress is logged after each batch: 'Published players 1–50 (50 total)'
- At the end, a summary: total created, total skipped, total time"

[Show the game and performance sections of the plan]

"For games and performances, the same pattern applies but with an added dependency: we need to resolve team and player IDs before we can set relations on a game or performance. The script will load the ID maps from the previous publish runs before starting."

---

### A NOTE ON TIME AND COST

"I want to be transparent about what bulk publishing at this scale actually involves.

Publishing 300,000+ entities to the Geo testnet takes time — realistically multiple hours for a full season run. We'll do the teams and players live in the next session and show the game/performance bulk publish running. But we won't sit through the full run on camera.

The testnet has no gas costs, so the financial side is not a concern here. What matters is respecting rate limits and not hammering the RPC endpoint. The batch strategy we just designed handles that — we're publishing in controlled chunks, not flooding the network."

---

## WRAP-UP

"That's Video 5. We've enriched the graph with navigable data blocks on game entities, and we've planned and started writing the bulk publishing scripts that will fill the 2024 season.

In the next video, we run the bulk publish, let it run to completion, and then pivot to the application. Once the data is in the graph, we'll build a web app on top of it using the Geo GraphQL API — querying entities, navigating relations, and presenting baseball data in a way that wouldn't be possible with a flat dataset.

Repo link is in the description. See you next time."

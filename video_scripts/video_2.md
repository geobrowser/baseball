# Video 2: Designing a Baseball Ontology on Geo

---

## INTRO

"Welcome back. In the last video, we downloaded and explored 9.6 gigabytes of Retrosheet baseball data and got a feel for how the Geo knowledge graph model works.

Today we're going to design the ontology — the full type system and property schema that will define how our baseball data is structured on Geo.

This is the most important step in the whole project. The ontology determines what you can query, how the data is navigated, and what apps you can build on top. Getting it right now saves a lot of rework later.

We're going to do most of this with Claude — I'll show you the prompts I'm using and we'll iterate through the design decisions in real time."

---

## WHAT IS AN ONTOLOGY?

"Before we start, let me clarify what I mean by ontology in this context.

On Geo, an ontology is the set of entity types and properties that define the structure of your knowledge graph. Entity types are things like Player, Game, Team, Ballpark. Properties are the attributes and relationships that describe them — things like 'Date', 'Home team', 'ERA', 'Birth city'.

Every property has a data type: Integer, Float, Text, Date, Boolean, Relation, and so on. Relations are the special one — instead of storing a value directly, a Relation points to another entity. So 'Birth city' isn't a text string; it's a relation to a City entity. This is the super power of the knowledge graph so we want to use it as much as we can.

Getting the ontology right means: choosing the right types, the right properties with the right data types, and using relations wherever the data is actually an entity — not just a value."

---

## STARTING POINT: A PARTIAL EXAMPLE

[Screen: the Game type block from walkthrough_prompts.txt]

"I've already drafted a partial example for the Game type so Claude has something concrete to work from. This shows the format I want the full ontology in: entity types with their properties, and then a separate flat list of all property definitions with their data types.

For Game, I've started with the basics — date, game number, home and away teams as relations to Team entities, scores, game length in outs, and whether it was a night game as a boolean.

This is the template. Now I want Claude to extend this across all 14 data files."

---

## PROMPT 4 — INITIAL ONTOLOGY PROPOSAL

[Use Claude — Prompt 4 from walkthrough_prompts.txt]

[Paste the full prompt including the Game example into Claude, show it running]

"I'm giving Claude the Game partial example plus the data_samples.txt field reference and the knowledge-graph-ontology.md reference doc. I'm asking it to propose the full set of entity types and properties for all the baseball data we have.

Key questions I'm asking it to think through:
- What are the top-level entity types — the primary browseable nodes like Player, Game, Team?
- What are the reference or lookup types — small finite sets like Position, Handedness, Game type?
- What data types are appropriate for each property?
- Where should we use relations instead of storing a value directly?***"

[Show Claude's output — a large structured .txt proposal]

"Walk through the structure — point out:
- Top-level types: Player, Team, Ballpark, Season, Game, Play, Batting performance, Pitching performance, Fielding performance, Ejection, Roster entry
- Reference types: League, Position, Handedness, Role, Game type, Hit trajectory, Fielding position
- How the Game type was extended from the example with umpires, managers, attendance, weather, etc.
- How Player has a relation to City for birthplace, and a relation to Handedness"

---

## PROMPT 5 — RELATIONS OVER TEXT

[Use Claude — Prompt 5 from walkthrough_prompts.txt]

"The most important design principle for Geo is its graph structure. That means we should use relations wherever the data is actually an entity, not a string. Let me show you why this matters.

If I store 'Birth city: Tokyo' as a text property on a Player, I have an isolated string. I can display it, but I can't traverse it. I can't ask 'give me all players born in Tokyo' in a way that connects to a shared City entity that someone else might have enriched with population data or a photo.

But if 'Birth city' is a relation pointing to a City entity for Tokyo, now every player born in Tokyo is connected to the same node. Anyone can query that node. Anyone can enrich it. The graph becomes useful.

The same logic applies to League, Position, Handedness, Country, State — anything that is a finite, reusable concept should be an entity with a relation, not a string."

[Show Claude's updated proposal with text fields converted to relations and geographic type definitions added]

"Claude added City, State, Country, and League as explicit types — and updated all the properties that referenced them to be Relation type pointing at those entities. Now we have a proper geographic chain: Player → City → State → Country."

---

## PROMPT 6 — DATA TYPE DECISIONS

[Use Claude — Prompt 6 from walkthrough_prompts.txt]

"Data types matter more in a knowledge graph than in a flat database, because clients use them to decide how to display and filter data. Let me walk through the key decisions.

**Booleans for binary choices.** Day game vs night game — I want this as a Boolean, not 'D'/'N' strings. True means day game.

**Float64 for decimals.** ERA, batting average, fielding percentage — these are decimals. Float64.

**Innings pitched is a special case.** Baseball uses base-3 notation — 6.2 means 6 and two-thirds innings, not 6.2 innings. We need to document that in the property description so anyone reading this data understands the convention.

**Win probability, leverage index** — Float64.

I'm asking Claude to also flag anything else in the full ontology where the data type is ambiguous."

[Show Claude's response — updated types plus a list of other properties flagged for discussion]

"Walk through one or two of the ambiguous ones and make a decision on camera — for example, attendance as Integer not Float, park factor as Float64."

---

## PROMPT 7 — NAMING CONVENTIONS

[Use Claude — Prompt 7 from walkthrough_prompts.txt]

"Before we write any files, I want to lock in the naming conventions. Consistency here is important — if half the properties are 'RBI' and half are 'Rbi' or 'runs batted in', the ontology becomes confusing fast.

Here are the rules I want to enforce:
- Only the first letter of the first word is capitalized, unless it's an acronym: RBI, ERA, MLB, ID all stay all-caps
- Minor words in the middle of a name stay lowercase: 'Runner on 1B', 'Top of inning'
- Parenthetical units are not capitalized: 'Height (inches)', 'Weight (lbs)'
- Boolean properties: use positive phrasing without an 'Is' prefix for official baseball stats — 'Day game', 'Game started', 'Save'. Use 'Is' prefix for state descriptions — 'Is scoring play', 'Is designated hitter'."

[Show Claude's audit output — a list of all names that were changed and what they were changed to]

"Review a few of the changes — show examples of names that were corrected. This is where small inconsistencies get caught."

---

## PROMPT 8 — WRITING ONTOLOGY.TXT

[Use Claude — Prompt 8 from walkthrough_prompts.txt]

"Now we capture the full design in a human-readable document. I'm having Claude write ontology.txt at the repo root — this is the canonical design doc that anyone can read to understand the full schema.

It will have a section for each entity type, a section listing all relation types and what they connect, an entity relationship diagram, and a naming conventions summary."

[Show Claude writing the file, then open ontology.txt]

"This file becomes the source of truth for the ontology. Before we write any publish scripts, we'll always reference this. Scroll through the key sections — player, game, batting performance — to show the structure."

---

## PROMPT 9 — ONTOLOGY RULES DOC

[Use Claude — Prompt 9 from walkthrough_prompts.txt]

"I also want a rules doc that captures all the design decisions we just made. Not the schema itself — the principles behind the schema. This is what someone reads before making additions to the ontology.

It covers: when to use relations vs values, data type guidelines, naming conventions, entity modeling patterns, and the deduplication strategy we'll use when publishing."

[Show Claude writing docs/ontology-rules.md, then briefly open it]

"This doc is especially useful when we get to bulk publishing — it answers questions like 'should this be its own entity or a value?' without having to ask again."

---

## PROMPT 10 — CREATING ONTOLOGY.JSON

[Use Claude — Prompt 10 from walkthrough_prompts.txt]

"Now we need the machine-readable version. ontology.json is what our publish scripts will read to know what types and properties to create on Geo.

A few things make this more complex than just serializing the text doc:

First, stable IDs. Every type and property needs a unique ID that we generate once and never change. We use IdUtils.generate() from the Geo SDK to create them, but we write them as fixed strings in the file — they don't regenerate on every run.

Second, we need to check what already exists on Geo before creating anything. The root space already has types like Person, City, State, Country, Team, Role. If those exist, we mark them existing: true and use their IDs — we don't create duplicates. Same for properties: if a 'Name' or 'Description' property already exists at the right data type, we reuse it.

Third, for relation properties, we need a toEntityTypes array listing the valid target type IDs."

[Show Claude querying the API for existing types and building the JSON]

"The structure of ontology.json is: a 'types' object, a 'properties' object, and a 'type_schemas' object that maps each type to its list of properties."

[Open src/ontology.json and scroll through it briefly]

---

## PROMPT 11 — CLEANUP

[Use Claude — Prompt 11 from walkthrough_prompts.txt]

"Quick cleanup pass on ontology.json — making sure the relation field is named toEntityTypes consistently, all names follow our conventions, and every type and property has a description."

[Show the audit output — a short list of fixes]

---

## PROMPT 12 — FIELD MAPPINGS

[Use Claude — Prompt 12 from walkthrough_prompts.txt]

"The last artifact for this video is docs/field-mappings.md — a table that maps every field in every Retrosheet source file to the corresponding ontology property. All 14 files.

This is primarily a reference doc for when we write the publish scripts. When we're looking at a gamelog row and we see a field called 'visteam', we want to know immediately: that maps to the 'Visiting team' relation on the Game type.

I won't read through the whole thing, but let me show the structure and scroll through the gamelog section since that's the most complex file."

[Show Claude writing docs/field-mappings.md, then open it and scroll through one file's table]

---

## WRAP-UP

"That's Video 2 done. We've designed the full ontology for our baseball knowledge graph:

- 11 top-level entity types and 10 reference types
- Hundreds of properties with the right data types
- Relations everywhere the data is actually an entity
- A human-readable design doc, a rules doc, a machine-readable JSON, and a field mapping reference

In the next video, we'll publish this ontology to the Geo testnet — writing a script that reads ontology.json, checks what already exists on chain, and creates everything that's new. Then we'll verify it in the Geo browser.

Repo link is in the description. See you next time."

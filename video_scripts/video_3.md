# Video 3: Publishing the Baseball Ontology to Geo

---

## INTRO

"Welcome back. In the last video, we designed the full ontology for our baseball knowledge graph — entity types, properties, data types, naming conventions, and a machine-readable JSON file that captures all of it.

Today we're going to publish that ontology to the Geo testnet. That means writing a script that reads ontology.json, checks what's already on chain, and creates everything that's new. Then we'll open the Geo browser and verify that the types and properties actually show up.

By the end of this video, the schema is live. Anyone can query it."

---

## QUICK RECAP

"Here's where we landed in Video 2. We have:

- ontology.txt — the human-readable design doc
- src/ontology.json — the machine-readable version with stable IDs for every type and property
- docs/ontology-rules.md — the design principles behind the schema
- docs/field-mappings.md — how every Retrosheet source field maps to an ontology property

The ontology has 11 top-level entity types, about 10 reference types, and a few hundred properties. Some of those types — Person, City, State, Country, Team, Role — already exist in Geo's root space, so we marked them existing: true in ontology.json. We won't create duplicates for those.

Everything else needs to be published."

---

## PROMPT 13 — UPDATE CLAUDE.MD

[Use Claude — Prompt 13 from walkthrough_prompts.txt]

"Before we write the publish script, I want to make sure the project docs reflect where we are. CLAUDE.md is the context file that Claude reads at the start of every session — if the project layout section is out of date, Claude won't know what files exist.

I'm asking Claude to update the project layout section to include our new files and update the deep reference table to point to them."

[Show Claude updating CLAUDE.md, then open it briefly to confirm]

"Quick check — ontology.txt, src/ontology.json, docs/field-mappings.md, and docs/ontology-rules.md should all be in the layout now."

---

## PROMPT 14 — WRITING 08_PUBLISH_ONTOLOGY.TS

[Use Claude — Prompt 14 from walkthrough_prompts.txt]

[Show the prompt being pasted into Claude]

"This is the main script for this video. I'm asking Claude to write 08_publish_ontology.ts — a script that reads our ontology.json and publishes all the new types and properties to Geo.

Let me walk through the requirements I've specified:

**Skip existing entities.** Anything marked existing: true in ontology.json is already in the root space. We skip those entirely — no duplicate Person, City, or Team types.

**Idempotency.** Before creating anything, the script queries the Geo API by entity ID. If it's already been published, we skip it with a log message. This means running the script twice never creates duplicates.

**Publish order matters.** Properties go first, then types. Types reference property IDs in their schemas, so the properties have to exist before we try to create the types.

**Relation properties.** For properties with data type Relation, we pass the toEntityTypes array — the list of valid target type IDs — to Graph.createProperty(). This is how Geo knows that 'Visiting team' points to Team entities.

**Flags.** --dry-run writes the ops to a file without publishing, so I can review before committing. --force skips the API existence checks and publishes everything."

[Show Claude writing 08_publish_ontology.ts]

"While that's running, let me explain why publish order matters. The Geo SDK's Graph.createType() takes a schema — a list of property IDs. If those property IDs don't exist on chain yet, the type creation will reference non-existent entities. So properties always go first."

[Open 08_publish_ontology.ts and walk through the key sections]

"Walk through:
- How it reads and parses ontology.json
- The existence check loop before publishing
- The property publish loop with the toEntityTypes handling
- The type publish loop with schema resolution
- The --dry-run and --force flag handling"

---

## PROMPT 15 — DRY RUN

[Use Claude — Prompt 15 from walkthrough_prompts.txt]

[Run: `bun run 08_publish_ontology.ts --dry-run` in terminal]

"Before we publish anything for real, let's do a dry run. This writes the ops to a file so we can see exactly what would be created."

[Show the terminal output — counts of types and properties to be created, list of what would be skipped]

"Claude, can you analyze this dry run output? How many types and properties would be created? Are there any potential issues — missing IDs, unexpected skips, anything that looks wrong?"

[Show Claude's analysis]

"Walk through a couple of the key items — for example, confirm that Person, City, State, Country are correctly being skipped, and that a new type like 'Batting performance' is being created with the right property count."

---

## PROMPT 16 — PUBLISHING

[Use Claude — Prompt 16 from walkthrough_prompts.txt]

"Everything looks good. Let's publish."

[Run: `bun run 08_publish_ontology.ts` in terminal]

[Show the terminal output as it runs — the created/skipped log lines scrolling by]

"You can see it publishing properties first — each one logs whether it was created or skipped. Then types, with their property schemas resolved. At the end it calls publishOps() which submits the transaction to the Geo testnet."

---

## VERIFYING IN THE GEO BROWSER

[Switch to Geo browser — geobrowser.io or testnet equivalent]

"Now let's verify this actually worked. I'll open the Geo browser and navigate to our baseball space."

[Navigate to the space, show the type list]

"There's our type list. Let me find the Player type and open it."

[Open Player type]

"You can see all the properties in the default schema — Name, Birth date, Birth city as a relation to City, Handedness as a relation to Handedness, Hall of Fame as a boolean, and so on. These are all clickable — you can navigate the schema directly in the browser.

Let me also check one of the reference types — Handedness."

[Open Handedness type]

"Simple type, just a name. This will have three instances: Left, Right, and Switch. We'll publish those in the next video when we do test entities.

Let me also check that the relation property 'Visiting team' on the Game type has the right target."

[Open Game type → Visiting team property]

"Relation data type, target type Team. Exactly right.

One more — let me verify that a system type like Person shows up correctly and is pointing at the root space ID, not our baseball space."

[Show Person type, confirm it's the root space entity]

"Everything checks out. The schema is live."

---

## WHAT JUST HAPPENED — AND WHY IT MATTERS

"Let me take a moment to explain what we actually just did, because it's different from deploying a schema to a traditional database.

When you deploy a schema to Postgres or MongoDB, that schema lives in your database, on your server, under your control. If you shut it down, the schema is gone.

What we just published is different. These types and properties are now entities on the Geo testnet — just like any other entity. They have IDs. They can be queried. They can be referenced by anyone who wants to build on the same schema. If someone else is publishing baseball data tomorrow, they can reuse our Player type, our Game type, our ERA property. The schema is a shared public resource.

This is what makes Geo different from a private API or a traditional database. The knowledge graph — including the schema — is open."

---

## WRAP-UP

"That's Video 3. The ontology is published to the Geo testnet. We went from a JSON file to a live, queryable schema in about 30 minutes.

In the next video, we start populating the graph. We'll publish reference entities — Handedness, Positions, Roles, Leagues — then geographic entities, then teams, players, a ballpark, a season, and a complete game with all its context. We'll navigate the live entities in the browser and see the relations working end to end.

Repo link is in the description. See you next time."

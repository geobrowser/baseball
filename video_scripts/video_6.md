# Video 6: Building a Baseball App on the Geo Knowledge Graph

---

## INTRO

"Welcome back. Last video we finished the bulk publishing scripts and got the full 2024 season into the graph — thousands of games, hundreds of players, millions of plays.

Today we build the app.

Everything we've done so far has been infrastructure: downloading data, designing the ontology, publishing entities and relations to a decentralized graph. Now we get to see the payoff. We're going to query the knowledge graph directly from a web app and build something you can actually use.

I'll be using Claude to generate the app in one shot — showing how a populated, well-structured knowledge graph makes application development dramatically easier than working with raw data files."

---

## CONFIRM THE GRAPH IS READY

[Open Geo browser — show the baseball space]

"Before we write a line of app code, let me show you the state of the graph. We have the full 2024 season published. Let me do a quick inventory."

[Query the API or show browser counts for key entity types]

"Games, players, teams, plays, performances — all in. The schema is solid. The relations are connected. This is the backend we're building on. No server, no database, no API to maintain. Just the graph."

---

## PROMPT 24 — DECIDING WHAT TO BUILD

[Use Claude — Prompt 24 from walkthrough_prompts.txt]

[Show the prompt — three app concepts: Virtual Hall of Fame, Game explorer, Historical search]

"I'm presenting Claude with three options and asking it to recommend the most compelling one given what our graph actually supports right now. Let me read the options:

- **Virtual Hall of Fame** — browse players, their career stats, teams they played for, ballparks
- **Game explorer** — navigate a specific game play by play, see batter vs pitcher matchup context
- **Historical search** — queries like 'all no-hitters at Fenway Park' or 'players born in Japan who hit 40 or more home runs'

I'm also asking Claude to sketch the architecture for whichever it recommends — what queries does the app need, what does the data flow look like."

[Show Claude's recommendation and reasoning]

"Walk through Claude's answer — which app it recommends, why it fits the graph structure, and what the key queries are. Discuss the recommendation on camera — do you agree? Is there a different angle that would be more interesting for the series?"

[Make the decision on camera]

"We're going with [chosen app]. Here's why: [your reasoning]. Let me explain what the core experience looks like before we start building."

---

## ARCHITECTURE WALKTHROUGH

"Let me sketch out what this app actually needs from the graph.

[Walk through the specific queries depending on chosen app — example below for Game explorer:]

The Game explorer needs three core queries:

**Query 1: List games.** Fetch Game entities, show date, home team, away team, score. Support filtering by team and date. This is the landing page.

**Query 2: Game detail.** Given a game ID, fetch all its property values and relations — teams, ballpark, season, managers, starting pitchers, umpires, final score.

**Query 3: Plays for a game.** Fetch all Play entities where the game relation equals this game ID, sorted by inning. Show the play-by-play.

Optionally: **Player context.** Given a batter or pitcher in a play, fetch their season stats for the matchup sidebar.

All of these go directly to the Geo GraphQL API using the patterns we set up in 01_api_demo.ts. No backend needed — the app queries the graph from the browser."

---

## PROMPT 25 — BUILDING THE APP

[Use Claude — Prompt 25 from walkthrough_prompts.txt]

[Show the prompt — referencing 01_api_demo.ts and docs/graphql-api.md]

"Now I'm handing Claude the full build. I'm asking for a complete React app — one shot — that queries the Geo GraphQL API and implements [the chosen app functionality].

I'm giving it the API patterns from 01_api_demo.ts, the GraphQL reference doc, the baseball space ID from .env, and the specific queries we just sketched. The cleaner the graph structure, the more specific I can be about what to query."

[Show Claude generating the app — components, queries, layout]

"This is a good demonstration of how knowledge graph structure pays off at the application layer. Because we used relations instead of text strings, Claude can write queries that traverse entity connections — not just fetch flat values. It can ask for a game and get the team name, city, and league in one traversal. It can ask for a play and get the batter's position and handedness in the same query."

[Show the generated app files]

"Walk through the key files:
- The GraphQL query definitions — show how they traverse relations
- The main list/browse component
- The detail view component
- Any filtering or search logic"

---

## RUNNING THE APP

[Run the app locally: `bun run dev` or equivalent]

[Open in browser]

"Let's see it."

[Navigate the app — demonstrate the core experience]

"Walk through:
- The landing page / list view — show real 2024 game data loading
- Click into a game — show the detail view with teams, ballpark, managers, score
- Open the play-by-play — scroll through the inning-by-inning view
- If there's a player detail view, navigate to a player from a play and show their stats

Point out: all of this data is coming directly from the Geo graph. No server. No database. The graph is the backend."

---

## WHAT THIS DEMONSTRATES

"Let me step back and talk about what we've actually built here, because it's different in an important way from a typical app.

A conventional baseball stats app pulls from a proprietary database. The data is locked behind that server. If the company shuts it down, the data is gone — or at least inaccessible. The app and the data are coupled.

What we built is decoupled. The knowledge graph is published on Geo — it's open, it's permanent, and it's queryable by anyone. Our app is just one consumer of the graph. Someone else could build a completely different app on the same data — a fantasy research tool, a prediction market bot, a historical archive browser — without duplicating any of the data or negotiating API access.

The graph is also composable. Our Player entities share the same City nodes as anyone else on Geo who publishes geographic data. Our Team entities can be linked to news articles, social data, satellite imagery — whatever other spaces publish, it can connect to our graph through shared entity IDs.

That's the value of a decentralized knowledge graph. Not just that the data is open, but that it's part of a connected web of structured knowledge that anyone can extend and build on."

---

## WRAP-UP

"That's Video 6. We've gone from a structured knowledge graph to a working web application — designed the app, generated the code with Claude, and navigated real 2024 MLB data in the browser.

In the final video, I'll demo the full app against the live graph, walk through some of the more powerful queries — the historical searches and traversals that really show what a knowledge graph makes possible — and talk about where this project goes from here.

Repo link is in the description. See you for the finale."

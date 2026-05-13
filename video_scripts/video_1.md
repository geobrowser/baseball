Hi everyone, I am Preston a member of the Geo core team. 

In this series, we are going to publish structured baseball data to the Geo knowledge graph.

Why baseball? not only is it americas past time. But opening day was yesterday so it is very timely right now. Plus, we have a great open data set that we can use. 

The data comes from Retrosheet — it's a free, public dataset covering nearly every Major League Baseball game from 1871 to 2025. We're talking 9.6 gigabytes of parsed data: game logs, play-by-play, player bios, team histories, ballparks, ejections.

At the end of this series, download baseball data, evaluate it and structure an ontology, publish that ontology and data to Geo. Then finally, we are going to use that data as the backend of a simple baseball application.

Today we're starting at the beginning: understanding the data, and getting a feel for the Geo protocol."

GEO PROTOCOL PRIMER (6:00 – 9:00)
[Screen: Geo browser or a simple diagram]

"Before we dig into the data, let me briefly explain what Geo actually is, because it shapes every design decision we'll make.

Geo is a decentralized knowledge graph network. The fundamental building block is an entity — think of it like a node in a graph. Every entity has a unique ID, a name, a type, and properties.

Properties come in two flavors: values and relations. A value is a primitive — a number, a string, a date, a boolean, and so on. A relation is a pointer to another entity. So instead of storing 'born in Tokyo' as a text string, you store a relation from a Player entity to a City entity for Tokyo, which in turn has a relation to a Country entity for Japan. That's what makes a knowledge graph: you can traverse those connections.

Entities live in spaces — think of a space as a namespace or a collection owned by a particular user, organization, or group of users. We'll be publishing our baseball data to the baseball space that I created.

The reference docs for all of this are in the docs/ folder if you want to go deeper. Today we just need the basic mental model."

EXPLORING THE GEO API (18:00 – 24:00)

Navigate to the repo. Point out the following files
- Knowledge graph ontology - informs claude how knowledge should be structured on Geo
- Spec - informs claude how to use the geo-sdk and publish data to Geo

A few other files to note
- Api demo
- Publishing demo
- Entity ops

Note: dont be afraid to ask claude to summarize a file to help you understand how to use the knowledge graph or the graphQL api. For example, we can run a prompt like this to get Geo to summarize the 01_api_demo.ts file.

[Use Claude — Prompt 2 from walkthrough_prompts.txt]

"The key thing to understand is the query model. Every entity has properties that can be fetched by type. Values come back as typed scalars. Relations come back as references to other entity IDs. The root space — Geo's shared system space — already has types like Person, City, State, Country, Team, Role."

WHAT'S ALREADY DONE (2:30 – 6:00)

Note, for the sake of time, I went ahead and downloaded this data already. To do so, I just asked claude to query retrosheets website to understand the data and then write a script to download it all. You can see those screipts in the scripts folder in this repo. 

"We can verify the full inventory by running the summarize script. You can see we have 14 files totaling 9.6 gigabytes — everything from player bios to pitch-by-pitch play data."

[Run bun run scripts/summarize_data.ts in terminal]


DATA EXPLORATION WITH CLAUDE (9:00 – 18:00)
[Screen: data_samples.txt open in editor]

"Now let's actually look at what we're working with. Rather than reading through 9.6 GB of data manually, we'll use Claude to help us explore and categorize it."

[Use Claude — Prompt 1 from walkthrough_prompts.txt]

[Paste prompt 1 into Claude, show it running in real time]

"I'm asking Claude to review the field reference file and give me a structured breakdown of all 14 data types — which fields would be good candidates for value properties, which should be relations to other entities, and what entity types are implied."

[Show Claude's output / data_exploration_notes.txt]

"Walk through the key findings:

Players: bio data, handedness, birth city/country, career date range, Hall of Fame flag
Teams: franchise info, leagues, home cities, active date ranges — lots of relation candidates here
Ballparks: names, locations, sometimes multiple names over time
Gamelogs: 161 fields per game — this is the richest data type. Attendance, scores, umpires, managers, starting pitchers, weather.
Plays: 159 columns per play — batter, pitcher, base state, event type, 80+ outcome flags. This is the granular stuff.
Performance stats: batting, pitching, fielding — per player per game"


WRAP-UP (24:00 – 26:00)
"That's it for Video 1. We've:


Got a feel for the Geo protocol
Walked through the full Retrosheet dataset
Produced an initial data exploration summary that will guide our ontology design

In the next video, we'll use all of this to design the full ontology — the type system and property schema for our baseball knowledge graph. That means deciding what entity types to create, what properties they have, what data types to use, and where to use relations instead of plain values.

Code is in the description. See you there."

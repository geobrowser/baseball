# Ontology Design Rules

Reference for anyone adding to or modifying the Retrosheet × Geo ontology. Codifies the design rules established when the schema was built. Read top-to-bottom before adding new types or properties; cross-reference [`ontology.txt`](../ontology.txt) for the current schema and [`knowledge-graph-ontology.md`](../knowledge-graph-ontology.md) for the GRC-20 system properties (Name, Description, Cover, Avatar, Blocks, etc.).

---

## 1. Relations vs values

Default to **relations** over text/numeric values whenever the value is *reusable* across entities or has a *bounded vocabulary*.

### Use a relation when:

| Trigger | Example | Target |
|---|---|---|
| Value is a finite enum | `Day game`, `Sky condition`, `Stat type` | reference entity (`Sky condition`) |
| Value names another real-world thing | `Birth city`, `Home team`, `Pitcher` | top-level entity (`City`, `Team`, `Person`) |
| Value will recur across many records | `League`, `Position` | reference or top-level entity |
| Same string would appear thousands of times | `"American League"`, `"Center field"` | top-level / reference entity |

### Use a text/numeric value when:

| Trigger | Example | Type |
|---|---|---|
| Free-form prose, unique per record | `Reason` on Ejection, `Notes` on Ballpark, `Postponement info` | Text |
| External identifier from source system | `Retrosheet person ID`, `ISO country code (alpha-2)` | Text |
| Numeric measurement | `Height (inches)`, `Attendance`, `Earned runs` | Integer / Float64 |
| Boolean flag | `Day game`, `Hall of fame`, `Is at bat` | Boolean |
| Raw composite code preserved for fidelity | `Event code` ("S7/L"), kept alongside decomposed relations | Text |

### Multi-target relations

When the same property may point to entities of different types depending on what's known, use a multi-target relation:

```
Birth place → City | State or region | Country
```

Population rule: link to the most-specific known place. The hierarchy is walkable through the target entity's own relations (City → State or region → Country).

### Multi-valued and ordered relations

- **Multi** when an entity legitimately has many of a thing: `Team.Leagues` (Houston: NL → AL), `Team.Home ballparks`, `Play.Event types` (Strikeout + Wild pitch).
- **Ordered** when sequence matters: `Roster entry.Positions played` (primary first, then by descending games), `Game.Umpires` (HP, 1B, 2B, 3B, LF, RF), `Play.Fielders involved` (sequence of fielders touching the ball).

---

## 2. Data type selection

GRC-20 data types: `Bool`, `Int64`, `Float64`, `Decimal`, `Text`, `Bytes`, `Date`, `Time`, `Datetime`, `Schedule`, `Point`, `Rect`, `Embedding`. Plus `Relation` for entity references.

### Integer

Counts, ordinals, year-only timestamps, anything where the source data is a whole number.

```
Hits | At bats | Runs batted in | Lineup position | Position number
Attendance | Duration (minutes) | Temperature (F) | Height (inches)
First active year | Year | Game number | Plate appearance number
```

### Float64

Ratios, averages, percentages, anything derived by division. Also for the base-3 baseball-IP convention.

```
Season batting average | Season ERA | Season fielding percentage
Innings pitched (e.g., 6.2 means 6⅔ — NOT 6.2)
```

When the same concept exists in raw and derived form, store both. Innings pitched uses `Innings pitched (outs)` (Integer, raw) plus `Innings pitched` (Float64, base-3 display).

### Date vs Integer "year"

- **Date** when the source carries a full calendar date: `Game.Date`, `Ballpark.Opening date`, `Person.Birth date`, `Roster entry.First game of season (date)`.
- **Integer year** when the source is year-only: `Team.First active year`, `League.Last active year`, `Season.Year`.

Don't fake a Jan-1 date from year-only data — it pollutes Date queries.

### Time, Datetime, Schedule

Time alone (`Game.Start time` = "8:08PM"). Datetime if both date+time matter. Schedule for RFC 5545 recurrence (not used in this ontology).

### Boolean

Only when the value is truly binary AND won't gain new states. Day-game vs night-game is binary (postponed games go to `null`, not a third value). Sky condition has many states (sunny/cloudy/dome/...) so it's a relation, not a Boolean.

### Text

Free-form prose (`Reason`, `Notes`, `Completion info`), external identifiers (`Retrosheet ID`, `ISO country code`), and raw composite codes preserved for round-tripping (`Event code`).

### Point

WGS84 coordinates with the Geo location renderable. Used for `Ballpark.Location`, `City.Location`. Skip when source data lacks lat/lon — don't fabricate from city names. (Geocoding deferred for this project.)

---

## 3. Naming conventions

Apply to type names, property names, and reference instance names.

### Rule 1 — Capitalize only the first letter of the first word

Acronyms keep their canonical case: `RBI`, `ERA`, `MLB`, `ID`, `OPS`, `WHIP`, `DH`, `PBP`, `ISO`, `DNP`, `OBP`, `SLG`.

```
✓  Hit by pitch         ✗  Hit By Pitch
✓  Hall of fame         ✗  Hall of Fame
✓  Runs batted in       ✗  Runs Batted In
✓  Retrosheet person ID ✓  ISO country code (alpha-2)
✓  World series         ✗  World Series
```

### Rule 2 — Minor words stay lowercase mid-name

Prepositions, articles, and conjunctions: `of`, `in`, `on`, `to`, `at`, `for`, `as`, `by`, `into`, `with`, `the`.

```
✓  Runner on 1B
✓  Top of inning
✓  Reached on error
✓  Grounded into double play
✓  Pitcher responsible for runner on first
✓  State or region
```

### Rule 3 — Parenthetical units are lowercase

```
✓  Height (inches)
✓  Weight (lbs)
✓  Duration (minutes)
✓  Innings pitched (outs)
✓  Temperature (F)
✓  Wind speed (mph)
✓  First game of season (date)
```

### Rule 4 — Boolean naming

Two flavors:

| Style | When | Examples |
|---|---|---|
| **Official-stat** (no prefix) | Sounds like a baseball stat or canonical game attribute | `Day game`, `Game started`, `Complete game`, `Save`, `Loss`, `Started at position`, `No outs recorded`, `Used DH`, `Hall of fame` |
| **State description** (`Is` prefix) | Describes what kind of thing this record is, not a stat | `Is plate appearance`, `Is at bat`, `Is designated hitter` |

Heuristic: if you'd find it in a box score, use official-stat style. If it's classifying a record by state/category, use `Is`-prefixed.

### Pluralization

Plural for multi-valued relations: `Teams`, `Leagues`, `Umpires`, `Home ballparks`, `Positions played`, `Event types`, `Fielders involved`, `Alternate Retrosheet IDs`.

Singular when the relation holds one value: `City`, `League` (on Ballpark — single primary), `Pitcher`, `Venue`.

---

## 4. Entity modeling patterns

### Three kinds of types

| Kind | Purpose | Examples |
|---|---|---|
| **Top-level entity type** | Browseable, page-style nodes; users search and link to them | `Person`, `Team`, `Game`, `Ballpark`, `City`, `Batting line` |
| **Relation entity type** | Entity that *acts as* a link between two others; carries data on the link itself | `Team game record`, `Umpire assignment`, `Roster position assignment`, `Team ballpark tenancy` |
| **Reference / lookup type** | Small finite enum, target of categorical relations | `Position`, `Handedness`, `Sky condition`, `Game type` |

When in doubt: would a user want a *page* for this thing? → Top-level. Does it carry data on a link? → Relation entity type. Is it a finite list of categories? → Reference type.

### One observation, one entity

A single real-world fact is one entity. A player traded mid-season produces *two* Roster entries (one per team-season-stint), not one entry with split fields. A pitcher with two appearances in a doubleheader produces two Pitching lines, not one with summed stats.

Conversely, one *individual* is one Person, even if they hold many roles (player, coach, manager). Roles surface through Roster entry / Staff stint membership.

### Relation entity types are first-class

When a relation carries data, the relation entity must have its own `Types: Type` definition with explicit Properties — same shape as any other type. Don't sprinkle ad-hoc fields on a relation.

```
Game.Teams → Team   (relation entity = Team game record)
  Team game record carries: Side, Score, Result, Manager,
    Starting pitcher, At bats, Hits, …
```

A relation property's full schema is therefore: **target type** + **relation entity type**. Both required when data lives on the link; only target needed for plain links.

### Geographic chain

Places are first-class entities and form a containment hierarchy:

```
City  →  State or region  →  Country
```

Each level holds its own page. Birth/death places, team cities, ballpark locations all link to the *same* shared City / State / Country entities — so navigating to "Santo Domingo" surfaces every Person born there, every team based there, every ballpark located there.

Properties referencing places use a multi-target relation pointing to the most-specific known level:

```
Person.Birth place → City | State or region | Country
```

If only the country is known (common for old players), link straight to Country.

### Composite codes → orthogonal relations

When source data uses a single string to encode multiple independent dimensions, decompose into separate relations rather than enumerating every combination.

Retrosheet event codes (~18,200 distinct in 500k-play sample) are the canonical example:

```
"S7/L"  →  Event types=[Single]
           Fielders involved=[Left field]
           Hit trajectory=Line drive

"63/G"  →  Event types=[Groundout]
           Fielders involved=[Shortstop, First base]
           Hit trajectory=Ground ball

"K+WP"  →  Event types=[Strikeout, Wild pitch]
```

Always preserve the raw composite as a Text property too (`Event code`) for round-trip fidelity.

### Wide-row → ordered multi-relation

When source data has parallel "X for category 1 / X for category 2 / …" columns, collapse them into an ordered multi-relation with the per-category data on the relation entity. Don't leave them as a flat row of properties.

```
allplayers.ndjson has g_p, g_sp, g_rp, g_c, g_1b, g_2b, …, g_pr (13 columns)

Roster entry.Positions played (multi, ordered → Position)
  with Roster position assignment.Games played on each link
```

```
gamelogs.ndjson has v_at_bats, v_hits, …, h_at_bats, h_hits, … (20 columns)

Game.Teams (multi, x2 → Team)
  with Team game record.At bats, .Hits, … on each link
```

```
gameinfo.ndjson has umphome, ump1b, ump2b, ump3b, umplf, umprf (6 columns)

Game.Umpires (multi, ordered → Person)
  with Umpire assignment.Umpire position on each link
```

Ordering for these is meaningful — primary-position-first, home-plate-first, chronological — not just insertion order.

### Unified types beat per-variant types

When several would-be entities share a schema, use one type with a discriminator relation rather than separate types:

```
Manager stint + Coach stint + Umpire stint  →  Staff stint (with Role)
```

Different schemas → different types. Same schema with a category → one type.

### Don't denormalize values that are one hop away

If a property's value is reachable via a relation hop, don't store it. Examples removed during the original audit:

- `Year` on Roster entry / Staff stint (reachable via Season → Year)
- `Date / Venue / Game type / Result` on stat lines (reachable via Game)
- `Active years (text)` on League (First/Last active year covers it)
- `Count` on Play (just `Balls` + `Strikes` concatenated)
- `Bats / Throws` on Roster entry (a Person attribute, not a season attribute)
- `Roles` on Person (inferable from Roster entry / Staff stint membership)

**Exceptions** (kept as deliberate denormalization):

- `Opponent team` on stat lines — common single-property hop in queries.
- `Score (visiting)` / `Score (home)` on Play — these are *mid-game* scores at the moment of the play, distinct from the Game's final scores. Not derivable.
- `Day of week` on Game / Scheduled game — derivable from Date but cheap to store and used heavily by browsing UIs.
- `Batter handedness` / `Pitcher handedness` on Play — must be stored because switch hitters' actual handedness varies per plate appearance based on pitcher.

When you keep a denormalized property, document *why* in the type's notes.

### Stat lines are entities, not relations

Per-game performance records (Batting line, Pitching line, Fielding line) are top-level entities even though they semantically link a Person to a Game. Why: they're browseable units of performance. "Show me Ohtani's batting lines this postseason" is a natural query, and a data block can render directly over the line entities.

Use a relation entity (rather than a top-level entity) only when there's no independent "page" for the link itself — e.g., the team's box totals for a single game don't deserve their own page; they're a property of the Game-Team relationship.

### Roles, debut/last dates → derive from membership

Don't store summary lifecycle info on Person:

- A player's "debut year" = min(First game of season) across their Roster entries.
- A manager's career = Staff stints with Role=Manager.
- "Is a manager" = exists Staff stint with Role=Manager.

The benefit: lifecycle data stays consistent with the actual Roster entries / Staff stints. Adding a stint automatically updates the inferred timeline without a separate sync step.

---

## 5. Deduplication

Top-level entities must not duplicate. The publish pipeline runs a lookup-or-create step before producing each entity.

### Lookup priority order

1. **External ID match** when the source has a stable identifier:
   - `Retrosheet person ID` for Person
   - `Retrosheet team ID` (and `Alternate Retrosheet IDs`) for Team
   - `Retrosheet park ID` for Ballpark
   - `Retrosheet ID` for Game

2. **Name + type match** when no external ID exists:
   - City, State or region, Country: name (case-insensitive, trimmed) + parent country
   - League: name + abbreviation
   - Reference instances: name (these are static enums; populate once)

3. **Composite key match** for derived entities:
   - Season: (Year, League)
   - Roster entry: (Person, Team, Season)
   - Staff stint: (Person, Team, Season, Role)
   - Stat lines: (Person, Game, Stat type, sequence number)
   - Team game record: (Game, Side)

### Normalize before lookup

Strip and lowercase keys before comparing:

```
"  Boston "      →  "boston"
"American League" →  "american league"
```

Apply a small alias table for known variations (e.g., Retrosheet's mixed `D`/`d`/`A` for time-of-day, capitalized `Regular` vs lowercase `regular`).

### Same-name disambiguation

City names (Springfield, Portland) recur across regions. Use the parent State or region + Country in the lookup key — never name alone.

For Person disambiguation when no Retrosheet ID is available, use name + birth date as the fallback key.

### Alias storage

Source-system identifiers go in dedicated `Retrosheet * ID` text properties. Historical alternate names (team relocations, player nicknames, ballpark renamings) go in a single `Also known as` multi-text property — never as parallel `First name` / `Nickname` / `Former name` columns.

### Don't create placeholders

When a referenced value is missing or empty, **omit the relation entirely** rather than linking to a "Unknown" or "—" placeholder entity:

- 4,419 Negro Leagues roster records with null `position` → skip the Roster position assignment relation.
- 77 teams with empty `league` field → skip the Leagues relation.
- 2 corrupt `NY1` ejection rows → filter at ingest, don't create a fake Ejection role.

Placeholders pollute browseability ("show me everything with role = Unknown" is rarely the question being asked) and they're harder to detect than `null`.

---

## 6. When in doubt

- **Add a new type or extend an existing one?** If the schema differs in even one property from existing types, make a new type. If it shares the schema with a discriminator, extend.
- **Top-level vs reference type?** Will users want a page for it? Top-level. Is it a finite enum that can fit in one screen of instances? Reference.
- **New property vs note in Description?** If you'd query/filter on it, property. If it's prose, Description (or `Notes` text property).
- **Boolean vs reference type?** Two states forever? Boolean. More than two, or might gain states? Reference type.
- **Store derived value or compute on read?** Derived metrics that are queried (season averages, season ERA) → store. One-off display formats (full sentence summaries) → compute.

If a question isn't answered here or in [`ontology.txt`](../ontology.txt), document the new decision in both files when you resolve it.

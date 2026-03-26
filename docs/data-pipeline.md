# Data Pipeline

## Overview

Two data sources feed the baseball knowledge graph:

1. **Retrosheet** (historical) — Download from retrosheet.org, parse into structured JSON
2. **MLB Stats API** (live) — Fetch from statsapi.mlb.com, output structured JSON/NDJSON

Both output to `data/` subdirectories and follow the same conventions.

## Retrosheet Pipeline (Historical)

## Steps

### 1. Download Raw Data

```bash
bun run scripts/download_retrosheet.ts              # all groups
bun run scripts/download_retrosheet.ts --group 1     # reference data only
```

Groups:
1. Reference (bio, ballparks, teams, rosters)
2. Master CSVs
3. League-specific & game-type CSVs
4. Event files (play-by-play)
5. Game logs
6. Supplementary (schedules, ejections, official totals)

Data goes to `data/raw/` (zips) and `data/extracted/` (unzipped).

### 2. Parse Data

```bash
bun run scripts/parse_players.ts       # → data/parsed/players.json
bun run scripts/parse_teams.ts         # → data/parsed/teams.json
bun run scripts/parse_gamelogs.ts      # → data/parsed/gamelogs.ndjson
bun run scripts/parse_ballparks.ts     # → data/parsed/ballparks.json
bun run scripts/parse_rosters.ts       # → data/parsed/rosters.json
bun run scripts/parse_schedules.ts     # → data/parsed/schedules.json
bun run scripts/parse_ejections.ts     # → data/parsed/ejections.json
bun run scripts/parse_master_csvs.ts   # → data/parsed/master_*.json
```

### 3. Validate

```bash
bun run scripts/summarize_data.ts      # prints stats and spot checks
```

## Data Formats

**Players** (`players.json`): retrosheet_id, names, birth/death info, debut/last dates, bats/throws, height/weight, hall_of_fame, roles[].

**Teams** (`teams.json`): retrosheet_id, league, city, nickname, full_name, first/last_year, alt_ids[].

**Game Logs** (`gamelogs.ndjson`): date, teams, scores, attendance, umpires, lineups (161 fields per game). NDJSON format for streaming large files.

## MLB Stats API Pipeline (Live)

### Fetch Live Data

```bash
bun run scripts/fetch_mlb_live.ts                          # today's games
bun run scripts/fetch_mlb_live.ts --date 2025-04-01        # specific date
bun run scripts/fetch_mlb_live.ts --range 2025-04-01 2025-04-07  # date range
```

Output goes to `data/live/`:
- `schedule_YYYY-MM-DD.json` — All games for the date (teams, scores, venue, status)
- `games_YYYY-MM-DD.ndjson` — Play-by-play events (batter, pitcher, event, description, RBI)
- `boxscores_YYYY-MM-DD.ndjson` — Game summaries (scores, hits, errors, W/L/S pitchers, attendance)

### API Endpoints Used

- Schedule: `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=YYYY-MM-DD`
- Live feed: `https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live` (play-by-play + Statcast)
- Boxscore: `https://statsapi.mlb.com/api/v1/game/{gamePk}/boxscore`

### Coverage

- Schedules & boxscores: 1901–present (223K+ regular season games)
- Play-by-play: 1950–present
- Statcast (pitch velocity, spin, exit velo): 2015–present only

See `data_samples_live.txt` for full field reference with examples.

## Key Conventions

- Retrosheet dates (YYYYMMDD) are converted to RFC 3339 (`YYYY-MM-DD`)
- Pipe-delimited and CSV formats are auto-detected
- Headers are auto-skipped when detected
- Null/empty fields become `null` in JSON output
- MLB API team codes differ from Retrosheet (NYY vs NYA) — see mapping in `data_samples_live.txt`
- Player IDs differ across sources (MLB integer vs Retrosheet string) — use Chadwick Bureau register for cross-reference

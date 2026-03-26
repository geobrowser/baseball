# Field-Level Mappings: Source Data → Ontology Properties

Property-by-property mapping from Retrosheet parsed files and MLB Stats API
responses to the ontology defined in `ontology.txt`.

**Legend:**
- **RS** = Retrosheet parsed file field
- **MLB** = MLB Stats API response field
- → **Entity** = resolve to a reference entity by matching on name/code
- `(system)` = uses a system property (Name, Description, Types)
- `—` = not available from this source

---

## Person

| Ontology Property | RS: players.json | MLB: /api/v1/people/{id} |
|---|---|---|
| Name `(system)` | `first_name` + `last_name` | `fullName` |
| Description `(system)` | Constructed from roles + years active | — |
| Retrosheet ID | `retrosheet_id` | — |
| MLB ID | — | `id` |
| Birth Date | `birth_date` | `birthDate` |
| Birth City → City | `birth_city` | `birthCity` |
| Birth State → State | `birth_state` | `birthStateProvince` |
| Birth Country → Country | `birth_country` | `birthCountry` |
| Death Date | `death_date` | — |
| Death City → City | `death_city` | — |
| Death State → State | `death_state` | — |
| Death Country → Country | `death_country` | — |
| Bats → Handedness | `bats` ("L"→Left, "R"→Right, "B"→Switch) | `batSide.code` ("L"/"R"/"S") |
| Throws → Handedness | `throws` ("L"→Left, "R"→Right) | `pitchHand.code` ("L"/"R") |
| Height (inches) | `height_inches` | Parse from `height` ("6' 4\"" → 76) |
| Weight (lbs) | `weight_lbs` | `weight` |
| Hall of Fame | `hall_of_fame` | — |
| MLB Debut Date | `debut_player` | `mlbDebutDate` |
| Last Game Date | `last_player` | — |
| Role → Role | `roles[]` ("player"→Player, "manager"→Manager, etc.) | Inferred from `primaryPosition` |

**ID cross-reference:** Use Chadwick Bureau register `key_retro` ↔ `key_mlbam` to match
the same person across sources. Fallback: match on `fullName` + `birthDate`.


## Team

| Ontology Property | RS: teams.json | MLB: /api/v1/teams?sportId=1 |
|---|---|---|
| Name `(system)` | `full_name` | `name` |
| Retrosheet ID | `retrosheet_id` | — |
| MLB ID | — | `id` |
| City → City | `city` | `locationName` |
| League → League | `league` ("AL"→American League, "NL"→National League, etc.) | `league.name` |
| Nickname | `nickname` | `teamName` |
| First Year | `first_year` | `firstYearOfPlay` (string → int) |
| Last Year | `last_year` | — (null if active) |

**Code mapping:** RS uses 2-3 char codes (NYA, LAN). MLB uses abbreviations (NYY, LAD).
See team code mapping table in `data_samples_live.txt`.


## Ballpark

| Ontology Property | RS: ballparks.json | MLB: gameData.venue (live feed) |
|---|---|---|
| Name `(system)` | `name` | `name` |
| Description `(system)` | `notes` | — |
| Retrosheet ID | `retrosheet_id` | — |
| MLB ID | — | `id` |
| City → City | `city` | `location.city` |
| State → State | `state` | `location.state` |
| Geo location | — | `location.defaultCoordinates` {lat, lon} |
| Capacity | — | `fieldInfo.capacity` |
| Surface Type → Surface Type | — | `fieldInfo.turfType` ("Grass", "Artificial Turf") |
| Roof Type → Roof Type | — | `fieldInfo.roofType` ("Open", "Retractable", "Dome") |
| Left Field Distance | — | `fieldInfo.leftLine` |
| Center Field Distance | — | `fieldInfo.center` |
| Right Field Distance | — | `fieldInfo.rightLine` |
| Start Date | `start_date` (M/D/YYYY → Date) | — |
| End Date | `end_date` (M/D/YYYY → Date, null if active) | — |

**Merge note:** RS has 656 historical venues; MLB API provides rich metadata only for
currently active venues (~30). Match on name + city for overlap.


## Season

| Ontology Property | Source |
|---|---|
| Name `(system)` | Constructed: "YYYY Season" |
| Year | Derived from game dates |

Created once per distinct year encountered in game data.


## Game

| Ontology Property | RS: gamelogs.ndjson | RS: gameinfo.ndjson | MLB: schedule | MLB: boxscore | MLB: live feed |
|---|---|---|---|---|---|
| Name `(system)` | `visiting_team` + " @ " + `home_team` + " — " + `date` | — | Constructed from `away_team` + `home_team` + `gameDate` | — | — |
| Description `(system)` | Constructed: score + pitchers | — | — | Constructed: score + W/L pitchers | — |
| Retrosheet Game ID | Constructed: team+YYYYMMDD+number | `gid` | — | — | — |
| MLB Game PK | — | — | `gamePk` | `gamePk` | `gamePk` |
| Game Date | `date` (YYYY-MM-DD) | `date` (YYYYMMDD → Date) | `gameDate` (ISO → Date) | — | — |
| Game Number | `game_number` ("0","1","2" → int) | `number` | — | — | — |
| Day Game | `day_night` ("D"→true, "N"→false) | `daynight` ("day"→true, "night"→false) | — | — | — |
| Game Type → Game Type | — | `gametype` (see mapping below) | — | — | — |
| Home Team → Team | `home_team` (RS code → Team entity) | `hometeam` | `home_team` (MLB code → Team entity) | — | — |
| Away Team → Team | `visiting_team` (RS code → Team entity) | `visteam` | `away_team` (MLB code → Team entity) | — | — |
| Venue → Ballpark | `park_id` (RS park code → Ballpark entity) | `site` | `venue` (name → Ballpark entity) | — | `gameData.venue.id` |
| Season → Season | Derived from `date` year | `season` | Derived from `gameDate` year | — | — |
| Home Score | `home_score` | `hruns` (string → int) | `home_score` | `home_score` | — |
| Away Score | `visiting_score` | `vruns` (string → int) | `away_score` | `away_score` | — |
| Game Length (outs) | `game_length_outs` | `innings` × 6 (approx) | — | — | — |
| Attendance | `attendance` | `attendance` (string → int) | — | `attendance` | `gameData.gameInfo.attendance` |
| Duration (minutes) | `duration_minutes` | `timeofgame` (string → int) | — | `duration_minutes` | `gameData.gameInfo.gameDurationMinutes` |
| Winning Pitcher → Person | `winning_pitcher_id` (RS ID → Person) | `wp` (RS ID → Person) | — | `winning_pitcher` (name → Person) | `liveData.decisions.winner.id` |
| Losing Pitcher → Person | `losing_pitcher_id` | `lp` | — | `losing_pitcher` (name → Person) | `liveData.decisions.loser.id` |
| Save Pitcher → Person | `save_pitcher_id` | `save` | — | `save_pitcher` (name → Person) | `liveData.decisions.save.id` |
| Home Starting Pitcher → Person | `h_starting_pitcher_id` | — | — | — | `gameData.probablePitchers.home.id` |
| Away Starting Pitcher → Person | `v_starting_pitcher_id` | — | — | — | `gameData.probablePitchers.away.id` |
| Home Manager → Person | `h_manager_id` | — | — | — | — |
| Away Manager → Person | `v_manager_id` | — | — | — | — |
| Home Plate Umpire → Person | `hp_umpire_id` | `umphome` | — | — | — |
| Temperature | — | `temp` (string → float, "0" = unknown → null) | — | — | `gameData.weather.temp` (string → float) |
| Wind | — | Constructed from `winddir` + `windspeed` | — | — | `gameData.weather.wind` |
| Sky Conditions → Sky Condition | — | `sky` ("sunny"→Sunny, "cloudy"→Cloudy, etc.) | — | — | `gameData.weather.condition` |

**Game Type mapping (RS `gametype` → entity):**
- `"regular"` → Regular Season
- `"worldseries"` → World Series
- `"alcs"` → ALCS
- `"nlcs"` → NLCS
- `"alds"` → ALDS
- `"nlds"` → NLDS
- `"wildcard"` → Wild Card
- `"allstar"` → All-Star Game


## Play

| Ontology Property | RS: plays.ndjson | MLB: live feed allPlays[] |
|---|---|---|
| Name `(system)` | Constructed: batter name + " vs " + pitcher name + " — " + event | Constructed: `matchup.batter.fullName` + " vs " + `matchup.pitcher.fullName` + " — " + `result.event` |
| Description `(system)` | Constructed from event code + game state | `result.description` |
| Game → Game | `gid` → Game entity | `gamePk` → Game entity |
| Batter → Person | `batter` (RS ID → Person) | `matchup.batter.id` (MLB ID → Person) |
| Pitcher → Person | `pitcher` (RS ID → Person) | `matchup.pitcher.id` (MLB ID → Person) |
| Batting Team → Team | `batteam` (RS code → Team) | — (derive from game + inning half) |
| Pitching Team → Team | `pitteam` (RS code → Team) | — (derive from game + inning half) |
| Inning | `inning` (string → int) | `about.inning` |
| Top of Inning | `top_bot` ("0"→true, "1"→false) | `about.halfInning` ("top"→true, "bottom"→false) |
| At Bat Index | `pn` (string → int) | `atBatIndex` |
| Event → Play Event | `event` code (see mapping below) | `result.event` → Play Event entity by name |
| RBI | Count from event parsing | `result.rbi` |
| Is Scoring Play | Derived from run movements | `about.isScoringPlay` |
| Outs Before | `outs_pre` (string → int) | `count.outs` (from prior state) |
| Outs After | `outs_post` (string → int) | Derived from play result |
| Balls | `balls` ("?" → null, else int) | `count.balls` |
| Strikes | `strikes` ("?" → null, else int) | `count.strikes` |
| Runner on 1B → Person | `br1_post` (RS ID → Person, "" → null) | From `runners[]` where `movement.end` = "1B" |
| Runner on 2B → Person | `br2_post` (RS ID → Person) | From `runners[]` where `movement.end` = "2B" |
| Runner on 3B → Person | `br3_post` (RS ID → Person) | From `runners[]` where `movement.end` = "3B" |

**RS event code → Play Event entity mapping (common codes):**
- `"S"` / `"S7"` / `"S8"` / `"S9"` → Single
- `"D"` / `"D7"` / `"D8"` / `"D9"` → Double
- `"T"` / `"T7"` / `"T8"` / `"T9"` → Triple
- `"HR"` / `"H"` → Home Run
- `"W"` → Walk
- `"IW"` → Intent Walk
- `"K"` → Strikeout
- `"HP"` → Hit By Pitch
- `"63"` / `"43"` / `"53"` etc. → Groundout (numeric fielding sequences)
- `"8/F"` / `"9/F"` / `"7/F"` → Flyout
- `"8/L"` / `"9/L"` → Lineout
- `"E#"` → Field Error
- `"FC"` → Fielders Choice
- `"SH"` → Sac Bunt
- `"SF"` → Sac Fly
- `"GDP"` → Grounded Into DP
- `"CS2"` / `"CS3"` / `"CSH"` → Caught Stealing
- `"NP"` → No Play (ignored — don't create entity)

Full RS event code parsing documented at: https://www.retrosheet.org/eventfile.htm


## Batting Performance

| Ontology Property | RS: batting.ndjson | MLB: boxscore teams.{side}.players.{id}.stats.batting |
|---|---|---|
| Name `(system)` | Constructed: player name + " — " + date | Constructed: player name + " — " + game date |
| Description `(system)` | Constructed: "H-for-AB, HR HR, RBI RBI" | `summary` field |
| Player → Person | `id` (RS ID → Person) | Player `person.id` (MLB ID → Person) |
| Game → Game | `gid` → Game entity | `gamePk` → Game entity |
| Team → Team | `team` (RS code → Team) | Parent team in boxscore |
| Season → Season | Derived from `date` year | Derived from game date year |
| Lineup Position | `b_lp` (string → int) | `battingOrder` / 100 |
| Plate Appearances | `b_pa` (string → int) | `plateAppearances` |
| At Bats | `b_ab` (string → int) | `atBats` |
| Runs | `b_r` (string → int) | `runs` |
| Hits | `b_h` (string → int) | `hits` |
| Doubles | `b_d` (string → int) | `doubles` |
| Triples | `b_t` (string → int) | `triples` |
| Home Runs | `b_hr` (string → int) | `homeRuns` |
| RBI | `b_rbi` (string → int) | `rbi` |
| Walks | `b_w` (string → int) | `baseOnBalls` |
| Intentional Walks | `b_iw` (string → int) | `intentionalWalks` |
| Strikeouts | `b_k` (string → int) | `strikeOuts` |
| Stolen Bases | `b_sb` (string → int) | `stolenBases` |
| Caught Stealing | `b_cs` (string → int) | `caughtStealing` |
| Hit By Pitch | `b_hbp` (string → int) | `hitByPitch` |
| Sacrifice Hits | `b_sh` (string → int) | `sacBunts` |
| Sacrifice Flies | `b_sf` (string → int) | `sacFlies` |
| Grounded Into Double Play | `b_gdp` (string → int) | `groundIntoDoublePlay` |
| Is Designated Hitter | `dh` ("1"→true, else false) | Derive from `position.abbreviation` == "DH" |

**Note:** RS fields use string "0" for zero. Missing fields mean zero. Filter `stattype` = "value" (ignore "official").


## Pitching Performance

| Ontology Property | RS: pitching.ndjson | MLB: boxscore teams.{side}.players.{id}.stats.pitching |
|---|---|---|
| Name `(system)` | Constructed: player name + " — " + date | Constructed: player name + " — " + game date |
| Description `(system)` | Constructed: "IP IP, H H, ER ER, K K" | `summary` field |
| Player → Person | `id` (RS ID → Person) | Player `person.id` (MLB ID → Person) |
| Game → Game | `gid` → Game entity | `gamePk` → Game entity |
| Team → Team | `team` (RS code → Team) | Parent team in boxscore |
| Season → Season | Derived from `date` year | Derived from game date year |
| Pitching Sequence | `p_seq` (string → int) | Derive from order in `pitchers[]` array |
| Innings Pitched | `p_ipouts` (outs → IP: divide by 3, remainder as decimal .1/.2) | `inningsPitched` (string → float, e.g., "6.2") |
| Hits Allowed | `p_h` (string → int) | `hits` |
| Runs Allowed | `p_r` (string → int) | `runs` |
| Earned Runs | `p_er` (string → int) | `earnedRuns` |
| Home Runs Allowed | `p_hr` (string → int) | `homeRuns` |
| Walks Issued | `p_w` (string → int) | `baseOnBalls` |
| Strikeouts | `p_k` (string → int) | `strikeOuts` |
| Batters Faced | `p_bfp` (string → int) | `battersFaced` |
| Pitches Thrown | — | `pitchesThrown` |
| Wild Pitches | `p_wp` (string → int) | `wildPitches` |
| Balks | `p_bk` (string → int) | `balks` |
| Is Game Start | `p_gs` ("1"→true, else false) | `gamesStarted` > 0 |
| Is Complete Game | `p_cg` ("1"→true, else false) | `completeGames` > 0 |
| Is Shutout | — | `shutouts` > 0 |
| Is Win | Derived from `gid` + gameinfo `wp` | `wins` > 0 |
| Is Loss | `lp` ("1"→true) | `losses` > 0 |
| Is Save | — | `saves` > 0 |


## Fielding Performance

| Ontology Property | RS: fielding.ndjson | MLB: boxscore teams.{side}.players.{id}.stats.fielding |
|---|---|---|
| Name `(system)` | Constructed: player name + " (POS) — " + date | Constructed: player name + " (POS) — " + game date |
| Player → Person | `id` (RS ID → Person) | Player `person.id` (MLB ID → Person) |
| Game → Game | `gid` → Game entity | `gamePk` → Game entity |
| Team → Team | `team` (RS code → Team) | Parent team in boxscore |
| Season → Season | Derived from `date` year | Derived from game date year |
| Fielding Position → Position | `d_pos` (number → Position entity, see mapping) | Player `position.abbreviation` → Position entity |
| Innings Fielded | `d_ifouts` (outs → IP: divide by 3, remainder as decimal .1/.2) | — |
| Putouts | `d_po` (string → int) | `putOuts` |
| Assists | `d_a` (string → int) | `assists` |
| Errors | `d_e` (string → int) | `errors` |
| Double Plays | `d_dp` (string → int) | — |

**RS `d_pos` → Position entity mapping:**
- 1 → Pitcher, 2 → Catcher, 3 → First Base, 4 → Second Base, 5 → Third Base,
  6 → Shortstop, 7 → Left Field, 8 → Center Field, 9 → Right Field, 10 → Designated Hitter


## Pitch

| Ontology Property | MLB: live feed allPlays[].playEvents[] |
|---|---|
| Name `(system)` | Constructed: "Pitch #" + `pitchNumber` + " — " + `details.type.description` |
| Play → Play | Parent `allPlays[]` item → Play entity |
| Game → Game | `gamePk` → Game entity |
| Pitcher → Person | Parent play `matchup.pitcher.id` (MLB ID → Person) |
| Batter → Person | Parent play `matchup.batter.id` (MLB ID → Person) |
| Pitch Number | `pitchNumber` |
| Pitch Type → Pitch Type | `details.type.description` → Pitch Type entity by name |
| Pitch Call → Pitch Call | `details.description` → Pitch Call entity by name |
| Start Speed | `pitchData.startSpeed` |
| End Speed | `pitchData.endSpeed` |
| Spin Rate | `pitchData.breaks.spinRate` |
| Spin Direction | `pitchData.breaks.spinDirection` |
| Strike Zone | `pitchData.zone` |
| Plate X | `pitchData.coordinates.pX` |
| Plate Z | `pitchData.coordinates.pZ` |
| Launch Speed | `hitData.launchSpeed` (final pitch of batted ball only) |
| Launch Angle | `hitData.launchAngle` (final pitch of batted ball only) |
| Hit Distance | `hitData.totalDistance` (final pitch of batted ball only) |
| Hit Trajectory → Hit Trajectory | `hitData.trajectory` ("fly_ball"→Fly Ball, etc.) |

**Hit Trajectory mapping:**
- `"ground_ball"` → Ground Ball
- `"line_drive"` → Line Drive
- `"fly_ball"` → Fly Ball
- `"popup"` → Popup

**Filter:** Only create Pitch entities where `isPitch` = true (skip pickoffs, mound visits, etc.).
Only populate Statcast fields (speed, spin, coordinates) when `pitchData.startSpeed` exists (2015+).


## Roster Entry

| Ontology Property | RS: rosters.json | MLB: /api/v1/teams/{id}/roster |
|---|---|---|
| Name `(system)` | Constructed: player name + " — " + team + " " + year | Constructed: player name + " — " + team + " " + season |
| Player → Person | `player_id` (RS ID → Person) | `person.id` (MLB ID → Person) |
| Team → Team | `team_id` (RS code → Team) | Parent team ID → Team entity |
| Season → Season | Derived from `year` | Derived from roster season param |
| Position → Position | `position` ("C"→Catcher, "SS"→Shortstop, etc.) | `position.abbreviation` → Position entity |
| Year | `year` | From season query parameter |

**RS position code → Position entity mapping:**
- P→Pitcher, C→Catcher, 1B→First Base, 2B→Second Base, 3B→Third Base,
  SS→Shortstop, LF→Left Field, CF→Center Field, RF→Right Field,
  DH→Designated Hitter, OF→Outfield


## Ejection

| Ontology Property | RS: ejections.json |
|---|---|
| Name `(system)` | Constructed: `ejected_name` + " ejected — " + `date` |
| Description `(system)` | `reason` |
| Game → Game | `game_id` → Game entity |
| Ejected Person → Person | `ejected_id` (RS ID → Person) |
| Ejected Role → Role | `role` ("P"→Player, "M"→Manager, "C"→Coach) |
| Team → Team | `team` (RS code → Team) |
| Ejecting Umpire → Person | `umpire_id` (RS ID → Person) |
| Ejection Inning | `inning` (string → int, "-1" → null) |
| Ejection Reason | `reason` |


---

## Reference Entity Resolution

How to resolve source values to reference entities:

### Team resolution
- **RS → Team entity:** Match `team` field (2-3 char RS code) against Team with matching Retrosheet ID
- **MLB → Team entity:** Match `team.id` or abbreviation against Team with matching MLB ID

### Person resolution
- **RS → Person entity:** Match RS ID directly against Person.Retrosheet ID
- **MLB → Person entity:** Match MLB integer ID against Person.MLB ID
- **Cross-source:** Chadwick register maps RS ↔ MLB IDs

### Ballpark resolution
- **RS → Ballpark entity:** Match `park_id` / `site` against Ballpark.Retrosheet ID
- **MLB → Ballpark entity:** Match `venue.id` against Ballpark.MLB ID

### Reference type resolution (City, League, Position, etc.)
- Match source value against entity Name (case-insensitive)
- Create entity on first encounter, reuse on subsequent
- For coded values (RS league "AL"), use the mapping to resolve to full name ("American League")

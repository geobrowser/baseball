# Field Mappings

Maps every source field in `data/parsed/` to its ontology target. Use this as the publish-pipeline reference: each row tells you which `properties.<key>` (or which entity-type-key, for derived entity creations) the field becomes.

**Conventions:**
- "Property" column gives the snake_case key from [`src/ontology.json`](../src/ontology.json) (use `ontology.properties.<key>.id`).
- "→ Entity" means the field becomes (or selects) a relation target — usually a top-level entity (`Person`, `Team`, etc.) looked up via deduplication.
- "Derived" means the property exists on the resulting entity but isn't a 1:1 from this field — value comes from joining/aggregating.
- "Skip" means we deliberately don't store it (denormalized, redundant, or low-value).
- Example values come from [`data_samples.txt`](../data_samples.txt).

---

## 1. `players.json` (26,961 records → `Person`)

| Source field | Example | Ontology target |
|---|---|---|
| `retrosheet_id` | `"ohtas001"` | `retrosheet_person_id` |
| `last_name` | `"Ohtani"` | → `name` (combined with first_name) |
| `first_name` | `"Shohei"` | → `name` |
| `full_name` | `"Shohei Ohtani"` | `name` (preferred — fallback to first+last) |
| `birth_name` | `null` | `also_known_as` (when ≠ name) |
| `alt_name` | `null` | `also_known_as` (when ≠ name) |
| `birth_date` | `"1994-07-05"` | `birth_date` |
| `birth_city` | `"Oshu"` | → `birth_place` (lookup or create `City`) |
| `birth_state` | `"Iwate"` | → `birth_place` (or used by City entity) |
| `birth_country` | `"Japan"` | → `birth_place` (or used by City entity) |
| `death_date` | `null` | `death_date` |
| `death_city` | `null` | → `death_place` |
| `death_state` | `null` | → `death_place` |
| `death_country` | `null` | → `death_place` |
| `debut_player` | `"2018-03-29"` | Skip on Person — used to seed Roster entry's `first_game_of_season_date` |
| `last_player` | `"2025-11-01"` | Skip on Person — same |
| `debut_coach` | `null` | Skip on Person — used to seed Staff stint dates |
| `last_coach` | `null` | Skip on Person — same |
| `debut_manager` | `null` | Skip on Person — same |
| `last_manager` | `null` | Skip on Person — same |
| `debut_umpire` | `null` | Skip on Person — same |
| `last_umpire` | `null` | Skip on Person — same |
| `bats` | `"L"` | → `bats` (lookup `Handedness` instance L/R/B/?) |
| `throws` | `"R"` | → `throws` (lookup `Handedness`) |
| `height_inches` | `76` | `height_inches` |
| `weight_lbs` | `203` | `weight_lbs` |
| `hall_of_fame` | `false` | `hall_of_fame` |
| `roles` | `["player"]` | Skip — inferable from Roster entry / Staff stint membership |

**Birth/Death place population rule:** link `birth_place` to the most-specific known level (City > State or region > Country). City entities themselves carry `state_or_region` and `country` relations.

---

## 2. `teams.json` (293 records → `Team`)

| Source field | Example | Ontology target |
|---|---|---|
| `retrosheet_id` | `"NYA"` | `retrosheet_team_id` |
| `league` | `"AL"` or `"NL;AL"` | → `leagues` (split on ";"; lookup `League` instances) |
| `city` | `"New York"` | → `city` (lookup `City`) |
| `nickname` | `"Yankees"` | Skip — folded into `name` |
| `full_name` | `"New York Yankees"` | `name` |
| `first_year` | `1903` | `first_active_year` |
| `last_year` | `2025` | `last_active_year` |
| `alt_ids` | `[]` | `alternate_retrosheet_ids` |

**Skip rules:**
- 77 records have empty `league` field — skip the `leagues` relation entirely (don't link to a placeholder).
- `home_ballparks` is **not** in this file — derived from `gamelogs` (filter to home games for this team, group by `park_id`, min/max date).

---

## 3. `ballparks.json` (656 records → `Ballpark`)

| Source field | Example | Ontology target |
|---|---|---|
| `retrosheet_id` | `"BOS07"` | `retrosheet_park_id` |
| `name` | `"Fenway Park"` | `name` |
| `aka` | `null` | `also_known_as` |
| `city` | `"Boston"` | → `city` (lookup `City`) |
| `state` | `"MA"` | → `state_or_region` |
| `start_date` | `"4/20/1912"` or `"1912-04-20"` | `opening_date` (normalize to ISO) |
| `end_date` | `null` | `closing_date` |
| `league` | `"AL"` | → `primary_league` |
| `notes` | `"BOS:1912-date; ..."` | `notes` |

**Data-quality:** `start_date` / `end_date` are mixed format (146 ISO, 115 M/D/YYYY, 395 null) — normalize to ISO during parsing. `Country` is not in source — set to USA (or derive from `state` lookup table). `Location` (Point lat/lon) is not in source — geocoding deferred.

---

## 4. `rosters.json` (125,566 records — joined with allplayers.ndjson → `Roster entry`)

`Roster entry` requires joining `rosters.json` (primary position) with `allplayers.ndjson` (per-position counts) on `(player_id, team_id, year)`.

| Source field | Example | Ontology target |
|---|---|---|
| `player_id` | `"ohtas001"` | → `person` (lookup `Person` by `retrosheet_person_id`) |
| `last_name` | `"Ohtani"` | Skip — already on Person |
| `first_name` | `"Shohei"` | Skip — already on Person |
| `bats` | `"L"` | Skip — already on Person (a Person attribute, not a season attribute) |
| `throws` | `"R"` | Skip — same |
| `team_id` | `"NLS"` | → `team` (lookup `Team`) |
| `position` | `"DH"` | First (primary) entry in `positions_played` ordered relation; lookup `Position` |
| `year` | `2024` | → `season` (lookup `Season` by year + league) — `year` not stored directly |

---

## 5. `gamelogs.ndjson` (237,580 records → `Game` + `Team game record`)

One gamelog row produces:
- 1 `Game` entity
- 2 `Team game record` relation entities (Home + Away on `Game.teams`)

### Game-level fields

| Source field | Example | Ontology target |
|---|---|---|
| `date` | `"2024-10-25"` | `date` |
| `game_number` | `"0"` | `game_number` |
| `day_of_week` | `"Fri"` | → `day_of_week` |
| `visiting_team` | `"NYA"` | → `teams` (Away side relation entity) |
| `home_team` | `"LAN"` | → `teams` (Home side relation entity) |
| `visiting_league` | `"AL"` | Skip on Game — drives league lookups for Team / Season |
| `home_league` | `"NL"` | Skip on Game — same |
| `visiting_score` | `3` | `team_game_record.score` (Away) |
| `home_score` | `6` | `team_game_record.score` (Home) |
| `game_length_outs` | `59` | `game_length_outs` |
| `day_night` | `"N"` | `day_game` (D → true, N → false) |
| `completion_info` | `null` | `completion_info` |
| `forfeit_info` | `null` | `forfeit_info` |
| `park_id` | `"LOS03"` | → `venue` (lookup `Ballpark`) |
| `attendance` | `52394` | `attendance` |
| `duration_minutes` | `207` | `duration_minutes` |
| `acquisition_info` | `"Y"` | Skip — provenance flag, not user-facing |

**Derived Game ID:** `Retrosheet ID` is computed as `home_team + date(YYYYMMDD) + game_number` to match `gameinfo.gid` format.

### Team game record fields (per side, two records per game)

| Source field (visiting / home) | Example | Ontology target |
|---|---|---|
| `v_at_bats` / `h_at_bats` | `40` / `33` | `team_game_record.at_bats` |
| `v_hits` / `h_hits` | `10` / `7` | `team_game_record.hits` |
| `v_doubles` / `h_doubles` | `1` / `2` | `team_game_record.doubles` |
| `v_triples` / `h_triples` | `0` / `2` | `team_game_record.triples` |
| `v_home_runs` / `h_home_runs` | `1` / `1` | `team_game_record.home_runs` |
| `v_rbi` / `h_rbi` | `3` / `6` | `team_game_record.runs_batted_in` |
| `v_walks` / `h_walks` | `3` / `1` | `team_game_record.walks` |
| `v_strikeouts` / `h_strikeouts` | `4` / `0` | `team_game_record.strikeouts` |
| `v_stolen_bases` / `h_stolen_bases` | `0` / `0` | `team_game_record.stolen_bases` |
| `v_left_on_base` / `h_left_on_base` | `6` / `6` | `team_game_record.left_on_base` |
| `v_manager_id` / `h_manager_id` | `"boona001"` / `"robed001"` | `team_game_record.manager` (→ `Person`) |
| `v_starting_pitcher_id` / `h_starting_pitcher_id` | `"coleg001"` / `"flahj002"` | `team_game_record.starting_pitcher` (→ `Person`) |
| `v_starting_pitcher_name` / `h_starting_pitcher_name` | `"Gerrit Cole"` | Skip — name comes from `Person` |
| (derived) | Win/Loss/Tie from scores | `team_game_record.result` (→ `Game result`) |
| (derived "Side") | Visiting → Away, Home → Home | `team_game_record.side` (→ `Side`) |

### Game-level umpire / pitcher fields

| Source field | Example | Ontology target |
|---|---|---|
| `hp_umpire_id` | `"torrc901"` | First entry in `umpires` (HP); also creates `Umpire assignment` |
| `hp_umpire_name` | `"Carlos Torres"` | Skip — name on Person |
| `winning_pitcher_id` | `"treib001"` | → `winning_pitcher` |
| `winning_pitcher_name` | `"Blake Treinen"` | Skip |
| `losing_pitcher_id` | `"cousj001"` | → `losing_pitcher` |
| `losing_pitcher_name` | `"Jake Cousins"` | Skip |
| `save_pitcher_id` | `null` | → `save_pitcher` |
| `save_pitcher_name` | `"(none)"` | Skip |

---

## 6. `gameinfo.ndjson` (224,877 records → enriches `Game` + creates `Umpire assignment`s)

Joins to `gamelogs` via `gid`. Carries weather, full umpire crew, and conditions.

| Source field | Example | Ontology target |
|---|---|---|
| `gid` | `"NYA202410300"` | `retrosheet_id` (Game key) |
| `visteam` | `"LAN"` | Skip — already on Game from gamelogs |
| `hometeam` | `"NYA"` | Skip |
| `site` | `"NYC21"` | Skip — already mapped to `venue` from `park_id` |
| `date` | `"20241030"` | Skip — already on Game; verify match |
| `number` | `"0"` | Skip — already on Game |
| `starttime` | `"8:08PM"` | `start_time` |
| `daynight` | `"night"` | Skip — `day_game` from gamelogs.day_night already set |
| `innings` | `"9"` | `innings_played` |
| `usedh` | `"true"` | `used_dh` |
| `timeofgame` | `"222"` | Skip — `duration_minutes` from gamelogs already set |
| `attendance` | `"49263"` | Skip — already on Game |
| `fieldcond` | `"unknown"` | → `field_condition` |
| `precip` | `"none"` | → `precipitation` |
| `sky` | `"cloudy"` | → `sky_condition` |
| `temp` | `"67"` | `temperature_f` |
| `winddir` | `"tolf"` | → `wind_direction` |
| `windspeed` | `"5"` | `wind_speed_mph` |
| `oscorer` | `"sprej701"` | → `official_scorer` |
| `umphome` | `"rippm901"` | `umpires`[0]; `Umpire assignment.umpire_position` = Home plate |
| `ump1b` | `"ticht901"` | `umpires`[1]; `Umpire assignment.umpire_position` = First base |
| `ump2b` | `"torrc901"` | `umpires`[2]; `Umpire assignment.umpire_position` = Second base |
| `ump3b` | `"fleta901"` | `umpires`[3]; `Umpire assignment.umpire_position` = Third base |
| `umplf` | `"carlm901"` | `umpires`[4]; `Umpire assignment.umpire_position` = Left field |
| `umprf` | `"eddid901"` | `umpires`[5]; `Umpire assignment.umpire_position` = Right field |
| `wp` | `"treib001"` | Skip — already on Game from gamelogs |
| `lp` | `"kahnt001"` | Skip — same |
| `save` | `"buehw001"` | Skip — same |
| `gametype` | `"worldseries"` | → `game_type` (lookup ref instance) |
| `vruns` | `"7"` | Skip — score on Team game record |
| `hruns` | `"6"` | Skip — same |
| `wteam` | `"LAN"` | Skip — derives `team_game_record.result` |
| `lteam` | `"NYA"` | Skip — same |
| `line` | `"y"` | Skip — provenance flag |
| `batteries` | `"both"` | Skip — provenance flag |
| `lineups` | `"y"` | Skip — provenance flag |
| `box` | `"y"` | Skip — provenance flag |
| `pbp` | `"y"` | Skip — provenance flag for stat lines |
| `season` | `"2024"` | Skip — drives `Season` lookup |

---

## 7. `schedules.ndjson` (238,816 records → `Scheduled game`)

| Source field | Example | Ontology target |
|---|---|---|
| `date` | `"2026-09-27"` | `date` |
| `game_number` | `"0"` | `game_number` |
| `day_of_week` | `"Sunday"` | → `day_of_week` |
| `visiting_team` | `"BAL"` | → `away_team` |
| `visiting_league` | `"AL"` | Skip — drives Season lookup |
| `visiting_game_number` | `"162"` | `away_team_game_number_in_season` |
| `home_team` | `"NYA"` | → `home_team` |
| `home_league` | `"AL"` | Skip |
| `home_game_number` | `"162"` | `home_team_game_number_in_season` |
| `time_of_day` | `"d"` / `"D"` / `"A"` / `"N"` / `"n"` / `"E"` / `"0"` | `day_game` (D/d/A→true; N/n/E→false; 0/null→null) |
| `postponement_info` | `"NYC21"` or `"Rain"` | `postponement_info`; if it's a park code, also drives `made_up_at_venue` |
| `makeup_date` | `null` or `"19430822"` | `makeup_date` (normalize to ISO Date) |

---

## 8. `ejections.json` (19,730 records → `Ejection`)

| Source field | Example | Ontology target |
|---|---|---|
| `game_id` | `"DET202409290"` | → `game` (lookup `Game` by `retrosheet_id`) |
| `date` | `"09/29/2024"` | `date` (normalize from M/D/YYYY) |
| `game_number` | `null` | Skip — game_number is on the Game entity |
| `ejected_id` | `"hinca001"` | → `ejected_person` (lookup `Person`) |
| `ejected_name` | `"A.J. Hinch"` | Skip — name on Person |
| `team` | `"DET"` | → `team` |
| `role` | `"M"` | → `ejected_role` (lookup `Ejection role` by code) |
| `umpire_id` | `"hudsm901"` | → `ejecting_umpire` |
| `umpire_name` | `"Marvin Hudson"` | Skip |
| `inning` | `"9"` | `inning` (parse to integer; `-1` becomes null) |
| `reason` | `"Arguing result..."` | `reason` |

**Filter at ingest:** drop the 2 records with `role = "NY1"` (1911-08-19) — fields are shifted.

---

## 9. `batting.ndjson` (5,746,328 records → `Batting line`)

| Source field | Example | Ontology target |
|---|---|---|
| `gid` | `"TOR202511010"` | → `game` |
| `id` | `"ohtas001"` | → `batter` |
| `team` | `"LAN"` | → `team` |
| `b_lp` | `"1"` | `lineup_position` |
| `b_seq` | `"1"` | `lineup_sequence` |
| `stattype` | `"value"` | → `stat_type` |
| `b_pa` | `"6"` | `plate_appearances` |
| `b_ab` | `"5"` | `at_bats` |
| `b_r` | `"0"` | `runs` |
| `b_h` | `"2"` | `hits` |
| `b_d` | `"0"` | `doubles` |
| `b_t` | `"0"` | `triples` |
| `b_hr` | `"0"` | `home_runs` |
| `b_rbi` | `"0"` | `runs_batted_in` |
| `b_sh` | `"0"` | `sacrifice_hits` |
| `b_sf` | `"0"` | `sacrifice_flies` |
| `b_hbp` | `"0"` | `hit_by_pitch` |
| `b_w` | `"1"` | `walks` |
| `b_iw` | `"0"` | `intentional_walks` |
| `b_k` | `"0"` | `strikeouts` |
| `b_sb` | `"0"` | `stolen_bases` |
| `b_cs` | `"0"` | `caught_stealing` |
| `b_gdp` | `"0"` | `grounded_into_double_play` |
| `b_xi` | `"0"` | `reached_on_interference` |
| `b_roe` | `"0"` | `reached_on_error` |
| `dh` | `"1"` | `is_designated_hitter` |
| `date` | `"20251101"` | Skip — derivable via `Game.date` |
| `number` | `"0"` | Skip — derivable via Game |
| `site` | `"TOR02"` | Skip — derivable via `Game.venue` |
| `vishome` | `"v"` | Skip — derivable from Game.teams + this team |
| `opp` | `"TOR"` | → `opponent_team` (kept as one-hop convenience) |
| `win` | `"1"` | Skip — derivable via Team game record |
| `loss` | `"0"` | Skip — same |
| `tie` | `"0"` | Skip — same |
| `gametype` | `"worldseries"` | Skip — derivable via `Game.game_type` |
| `box` | `"y"` | Skip — provenance |
| `pbp` | `"y"` | Skip — provenance |

**Normalize at ingest:** lowercase `gametype` ("Regular" → "regular" — 23 records).

---

## 10. `pitching.ndjson` (1,269,889 records → `Pitching line`)

| Source field | Example | Ontology target |
|---|---|---|
| `gid` | `"ARI202311010"` | → `game` |
| `id` | `"sewap001"` | → `pitcher` |
| `team` | `"ARI"` | → `team` |
| `p_seq` | `"3"` | `pitching_sequence` |
| `stattype` | `"value"` | → `stat_type` |
| `p_ipouts` | `"3"` | `innings_pitched_outs`; also drives `innings_pitched` (Float64 base-3) |
| `p_noout` | `"0"` | `no_outs_recorded` |
| `p_bfp` | `"8"` | `batters_faced` |
| `p_h` | `"5"` | `hits_allowed` |
| `p_d` | `"0"` | `doubles_allowed` |
| `p_t` | `"0"` | `triples_allowed` |
| `p_hr` | `"1"` | `home_runs_allowed` |
| `p_r` | `"4"` | `runs_allowed` |
| `p_er` | `"4"` | `earned_runs` |
| `p_w` | `"0"` | `walks_issued` |
| `p_iw` | `"0"` | `intentional_walks_issued` |
| `p_k` | `"2"` | `strikeouts` |
| `p_hbp` | `"0"` | `hit_batters` |
| `p_wp` | `"0"` | `wild_pitches` |
| `p_bk` | `"0"` | `balks` |
| `p_sh` | `"0"` | `sacrifice_hits_allowed` |
| `p_sf` | `"0"` | `sacrifice_flies_allowed` |
| `p_sb` | `"0"` | `stolen_bases_allowed` |
| `p_cs` | `"0"` | `caught_stealing` |
| `p_pb` | `"0"` | `passed_balls` |
| `p_gf` | `"1"` | `game_finished` |
| `p_gs` | (when present) | `game_started` |
| `p_cg` | (when present) | `complete_game` |
| `lp` | `"1"` (when set) | `loss` |
| `date` / `number` / `site` / `vishome` / `win` / `loss` / `tie` / `gametype` / `box` / `pbp` | various | Skip — same rationale as Batting line |
| `opp` | `"TEX"` | → `opponent_team` |

---

## 11. `fielding.ndjson` (1,738,253 records → `Fielding line`)

| Source field | Example | Ontology target |
|---|---|---|
| `gid` | `"BOS196106181"` | → `game` |
| `id` | `"geigg101"` | → `fielder` |
| `team` | `"BOS"` | → `team` |
| `d_seq` | `"1"` | `defensive_sequence` |
| `d_pos` | `"8"` | → `position` (lookup `Position` by position number) |
| `stattype` | `"value"` | → `stat_type` |
| `d_ifouts` | `"27"` | `innings_fielded_outs` |
| `d_po` | `"4"` | `putouts` |
| `d_a` | `"0"` | `assists` |
| `d_e` | `"0"` | `errors` |
| `d_dp` | `"0"` | `double_plays` |
| `d_tp` | `"0"` | `triple_plays` |
| `d_gs` | `"1"` | `started_at_position` |
| `date` / `number` / `site` / `vishome` / `win` / `loss` / `tie` / `gametype` / `box` / `pbp` | various | Skip — same rationale |
| `opp` | `"WS2"` | → `opponent_team` |

---

## 12. `plays.ndjson` (6,515,744 records → `Play`)

| Source field | Example | Ontology target |
|---|---|---|
| `gid` | `"WS2197004210"` | → `game` |
| `event` | `"W"` / `"S7/L"` / `"63"` | `event_code`; also drives `event_types`, `fielders_involved`, `hit_trajectory` (decompose) |
| `inning` | `"8"` | `inning` |
| `top_bot` | `"1"` | → `half_inning` (0=Top, 1=Bottom) |
| `vis_home` | `"1"` | Skip — same as top_bot |
| `site` | `"WAS10"` | Skip — derivable via `Game.venue` |
| `batteam` | `"WS2"` | → `batting_team` |
| `pitteam` | `"NYA"` | → `pitching_team` |
| `score_v` | `"5"` | `score_visiting` |
| `score_h` | `"7"` | `score_home` |
| `batter` | `"howaf102"` | → `batter` |
| `pitcher` | `"mcdal101"` | → `pitcher` |
| `lp` | `"3"` | `lineup_position` |
| `bat_f` | `"7"` | Skip — fielding-position context, captured via Fielders involved when relevant |
| `bathand` | `"R"` | → `batter_handedness` |
| `pithand` | `"R"` | → `pitcher_handedness` |
| `balls` | `"?"` or `"3"` | `balls` (null if `?`) |
| `strikes` | `"?"` or `"2"` | `strikes` (null if `?`) |
| `count` | `"??"` or `"32"` | Skip — duplicative of balls + strikes |
| `pa` | `"1"` | `is_plate_appearance` |
| `ab` | `"1"` | `is_at_bat` |
| `single` / `double` / `triple` / `hr` / `walk` / `strikeout` / `hbp` | various | Skip — derivable from `event_types` |
| `fly` / `ground` | various | Skip — derivable from `hit_trajectory` |
| `bip` | `"1"` | `ball_in_play` |
| `outs_pre` | `"2"` | `outs_before` |
| `outs_post` | `"2"` | `outs_after` |
| `br1_post` | `"howaf102"` | → `runner_on_first_after` |
| `br2_post` | (id) | → `runner_on_second_after` |
| `br3_post` | (id) | → `runner_on_third_after` |
| `pr1_post` | `"mcdal101"` | → `pitcher_responsible_for_runner_on_first` |
| `l1` … `l9` | (lineup IDs) | Skip — see decision 11 (lineup state reconstructable) |
| `lf1` … `lf9` | (positions) | Skip — same |
| `f2` … `f9` | (fielder IDs) | Skip — same |
| `pn` | (PA number) | `plate_appearance_number` |
| `date` | `"19700421"` | Skip — derivable via Game |
| `gametype` | `"regular"` | Skip — derivable via Game |
| `pbp` | `"deduced"` / `"y"` | → `pbp_source` (Recorded / Deduced) |

**Event code decomposition (the key transformation):**
The raw `event` string parses into three relations:
- `event_types` — atomic outcomes. `"S7/L"` → `[Single]`. `"K+WP"` → `[Strikeout, Wild pitch]`. `"63/G"` → `[Groundout, Double play]` (when context indicates).
- `fielders_involved` — fielder positions in sequence. `"63"` → `[Shortstop, First base]`. `"S7"` → `[Left field]`. `"8/F"` → `[Center field]`.
- `hit_trajectory` — modifier suffix. `/F` → Fly ball. `/G` → Ground ball. `/L` → Line drive. `/P` → Pop up. `/BG` → Bunt ground ball.

---

## 13. `allplayers.ndjson` (130,791 records — joined into `Roster entry`)

This file is *not* a separate entity type — it provides per-position game counts that populate `Roster entry.positions_played` (with `Roster position assignment` carrying `games_played` per position).

| Source field | Example | Ontology target |
|---|---|---|
| `id` | `"ohtas001"` | → `person` (Roster entry key) |
| `last` | `"Ohtani"` | Skip — already on Person |
| `first` | `"Shohei"` | Skip |
| `bat` | `"L"` | Skip — Person attribute |
| `throw` | `"R"` | Skip — Person attribute |
| `team` | `"ANA"` | → `team` (Roster entry key) |
| `g` | `"135"` | `roster_entry.games_played` (season total) |
| `g_p` | `"23"` | `roster_position_assignment.games_played` for `Position`=Pitcher |
| `g_sp` | `"23"` | (Pitcher detail — store on the Pitcher position relation, or skip — TBD by publisher) |
| `g_rp` | `"0"` | (Pitcher detail — same) |
| `g_c` | `"0"` | `roster_position_assignment.games_played` for `Position`=Catcher |
| `g_1b` | `"0"` | `roster_position_assignment.games_played` for `Position`=First baseman |
| `g_2b` | `"0"` | `roster_position_assignment.games_played` for `Position`=Second baseman |
| `g_3b` | `"0"` | `roster_position_assignment.games_played` for `Position`=Third baseman |
| `g_ss` | `"0"` | `roster_position_assignment.games_played` for `Position`=Shortstop |
| `g_lf` | `"0"` | `roster_position_assignment.games_played` for `Position`=Left fielder |
| `g_cf` | `"0"` | `roster_position_assignment.games_played` for `Position`=Center fielder |
| `g_rf` | `"0"` | `roster_position_assignment.games_played` for `Position`=Right fielder |
| `g_of` | `"0"` | `roster_position_assignment.games_played` for `Position`=Outfielder (used when LF/CF/RF not split) |
| `g_dh` | `"135"` | `roster_position_assignment.games_played` for `Position`=Designated hitter |
| `g_ph` | `"0"` | `roster_position_assignment.games_played` for `Position`=Pinch hitter |
| `g_pr` | `"0"` | `roster_position_assignment.games_played` for `Position`=Pinch runner |
| `first_g` | `"20230330"` | `first_game_of_season_date` (normalize YYYYMMDD → ISO) |
| `last_g` | `"20230903"` | `last_game_of_season_date` |
| `season` | `"2023"` | → `season` (Roster entry key) |

**Ordering rule for `positions_played`:** primary position from `rosters.position` first, then remaining positions ordered by descending `games_played`. Skip positions with `0` games.

---

## 14. `special_collections.json` (2,733 records across 7 categories → `Notable game collection` + `Game` references)

The file groups gameinfo-shaped records under category keys. We create one `Notable game collection` entity per category, holding a `Collection Data Block` whose Collection items relate to existing `Game` entities.

| Category key | Records | Maps to |
|---|---|---|
| `nohitters` | 359 | Collection: "No-hitters" / `Notable collection category` instance: `nohitters` |
| `tripleplays` | 629 | Collection: "Triple plays" / `Notable collection category` instance: `tripleplays` |
| `cycles` | 319 | Collection: "Cycles" / `Notable collection category` instance: `cycles` |
| `3HR` | 712 | Collection: "Three-home-run games" / `Notable collection category` instance: `3HR` |
| `15K` | 349 | Collection: "15+ strikeout games" / `Notable collection category` instance: `15K` |
| `20innings` | 48 | Collection: "20+ inning games" / `Notable collection category` instance: `20innings` |
| `interracial` | 317 | Collection: "Interracial games" / `Notable collection category` instance: `interracial` |

Within each category, every record has the same shape as `gameinfo.ndjson` (see §6). The records are **not** ingested as separate entities — they're used to look up the corresponding Game by `gid` and add it as a Collection item on the relevant Notable game collection.

| Source field (per record) | Maps to |
|---|---|
| `gid` | Lookup `Game.retrosheet_id`, add as Collection item on the matching Notable game collection |
| All other fields | Skip — same data already published via gameinfo for the corresponding Game |

---

## Cross-file derivation summary

Some entity types aren't sourced from a single file — they're materialized at publish time from joins / aggregations:

| Derived entity | Sources |
|---|---|
| `City`, `State or region`, `Country` | Deduped from `players.birth_city`/`birth_state`/`birth_country`, `teams.city`, `ballparks.city`/`state` |
| `League` | Deduped from `teams.league` (split on ";"), `ballparks.league`, `gamelogs.*_league`, `gameinfo.gametype` (postseason → MLB league) |
| `Season` | `(year, league)` keys derived from `gamelogs.date.year + visiting_league/home_league` and `schedules.*` |
| `Roster entry` | Join `rosters.json` (primary position) with `allplayers.ndjson` (per-position game counts) on `(player_id, team_id, year)` |
| `Staff stint` | Aggregate `gamelogs.h_manager_id` / `v_manager_id` per (manager, team, season). Aggregate `gameinfo.umphome / ump1b / ump2b / ump3b / umplf / umprf` per (umpire, season). Aggregate `gameinfo.oscorer` per (scorer, team, season). Date span from min/max game date |
| `Team ballpark tenancy` | Group `gamelogs` where `home_team = X` by `park_id`; min/max date per park |
| `Roster position assignment` | One per non-zero `g_<pos>` field in `allplayers.ndjson` per Roster entry |
| `Team game record` | Two per `gamelogs` row (Home + Away), populated from `v_*` / `h_*` fields |
| `Umpire assignment` | Up to 6 per `gameinfo` row, populated from `umphome / ump1b / ump2b / ump3b / umplf / umprf` |
| `Season batting average` etc. on Roster entry | Aggregate `Batting line` / `Pitching line` / `Fielding line` records grouped by `(person, team, season)`; compute the standard rate stats |

---

## Lookup keys for deduplication (publish-time)

When materializing an entity, look up first; create only if no match (per [docs/ontology-rules.md §5](./ontology-rules.md#5-deduplication)):

| Entity type | Primary lookup key | Fallback |
|---|---|---|
| `Person` | `retrosheet_person_id` | name + `birth_date` |
| `Team` | `retrosheet_team_id` | also check `alternate_retrosheet_ids` |
| `Ballpark` | `retrosheet_park_id` | name |
| `Game` | `retrosheet_id` | (date, home_team, game_number) |
| `City` | name + `state_or_region` + `country` | name + `country` if no region |
| `State or region` | name + `country` | — |
| `Country` | name (or ISO code) | — |
| `League` | name + abbreviation | — |
| `Season` | (year, league) composite | — |
| `Roster entry` | (person, team, season) composite | — |
| `Staff stint` | (person, team, season, role) composite | (person, season, role) for umpires/scorers |
| Stat lines | (person, game, stat_type, sequence) composite | — |
| Reference instances (Position, Handedness, etc.) | name | code |

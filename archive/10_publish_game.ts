/**
 * Publish a Complete Game from the MLB Stats API
 *
 * Fetches a full game from the MLB API (schedule, live feed, boxscore) and
 * publishes all entities: reference lookups, teams, venue, people, game,
 * plays, pitches, and batting/pitching/fielding performances.
 *
 * Deduplication: checks the API for existing entities before creating.
 * Reference entities (Pitch Type, Position, etc.) are cached within the run.
 *
 * Usage:
 *   bun run 10_publish_game.ts 778498                    # publish by gamePk
 *   bun run 10_publish_game.ts 778498 --dry-run          # preview
 *   bun run 10_publish_game.ts 778498 --skip-lookup      # skip API dedup checks
 */

import { IdUtils, type Op } from "@geoprotocol/geo-sdk";
import { publishOps, printOps, findEntityByName } from "./src/functions";
import {
  T, P, val,
  createEntityOps,
  lookupExisting,
  getOrCreateRef,
} from "./src/publish-helpers";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_LOOKUP = process.argv.includes("--skip-lookup");
const GAME_PK = parseInt(process.argv.find(a => /^\d+$/.test(a)) ?? "");

if (!GAME_PK) {
  console.error("Usage: bun run 10_publish_game.ts <gamePk> [--dry-run] [--skip-lookup]");
  process.exit(1);
}

// ── MLB API fetch ───────────────────────────────────────────────────────────

async function mlbFetch<T = any>(endpoint: string, version = "v1"): Promise<T> {
  const url = `https://statsapi.mlb.com/api/${version}${endpoint}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB API ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

// ── Entity ID tracking (gamePk-scoped stable IDs for plays/pitches) ─────────

const entityIds = new Map<string, string>();

function stableId(namespace: string, key: string | number): string {
  const cacheKey = `${namespace}:${key}`;
  if (!entityIds.has(cacheKey)) {
    entityIds.set(cacheKey, IdUtils.generate());
  }
  return entityIds.get(cacheKey)!;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const allOps: Op[] = [];
  const stats = { created: 0, found: 0 };

  function addOps(ops: Op[]) {
    allOps.push(...ops);
    if (ops.length > 0) stats.created++;
    else stats.found++;
  }

  console.log(`\nFetching game ${GAME_PK} from MLB API...`);

  const liveFeed: any = await mlbFetch(`/game/${GAME_PK}/feed/live`, "v1.1");
  const boxscore: any = await mlbFetch(`/game/${GAME_PK}/boxscore`);

  const gameData = liveFeed.gameData;
  const liveData = liveFeed.liveData;
  const plays = liveData.plays.allPlays;

  const awayTeamData = gameData.teams.away;
  const homeTeamData = gameData.teams.home;
  const venueData = gameData.venue;
  const weather = gameData.weather ?? {};
  const gameInfo = gameData.gameInfo ?? {};
  const decisions = liveData.decisions ?? {};

  const gameDate = gameData.datetime.originalDate; // YYYY-MM-DD
  const awayAbbrev = awayTeamData.abbreviation;
  const homeAbbrev = homeTeamData.abbreviation;

  console.log(`  ${awayAbbrev} @ ${homeAbbrev} — ${gameDate}`);
  console.log(`  ${plays.length} plays, ${plays.reduce((n: number, p: any) => n + (p.playEvents?.filter((e: any) => e.isPitch)?.length ?? 0), 0)} pitches`);

  // ── Season ──────────────────────────────────────────────────────────────

  console.log("\n── Season ──");
  const seasonYear = parseInt(gameDate.split("-")[0]);
  const seasonName = `${seasonYear} Season`;
  const { id: seasonId, ops: seasonOps } = await getOrCreateRef("season", seasonName, undefined, SKIP_LOOKUP);
  if (seasonOps.length > 0) {
    // Also set the year value
    const { ops } = createEntityOps({
      id: seasonId,
      name: seasonName,
      types: [T("season")],
      values: [{ propKey: "year", value: seasonYear }],
    });
    allOps.push(...ops);
    stats.created++;
    console.log(`  + ${seasonName}`);
  } else {
    stats.found++;
    console.log(`  ✓ ${seasonName} (exists)`);
  }

  // ── Teams ───────────────────────────────────────────────────────────────

  console.log("\n── Teams ──");

  async function getOrCreateTeam(teamData: any): Promise<string> {
    const name = teamData.name;
    const mlbId = teamData.id;
    const values = [
      { propKey: "mlb_id", value: mlbId },
      { propKey: "nickname", value: teamData.teamName },
    ];

    if (!SKIP_LOOKUP) {
      const existing = await lookupExisting(name, [T("team")], values);
      if (existing) {
        console.log(`  ✓ ${name} (exists: ${existing})`);
        stats.found++;
        return existing;
      }
    }

    const { id, ops } = createEntityOps({
      name,
      types: [T("team")],
      values,
    });
    addOps(ops);
    console.log(`  + ${name}`);
    return id;
  }

  const awayTeamId = await getOrCreateTeam(awayTeamData);
  const homeTeamId = await getOrCreateTeam(homeTeamData);

  // ── Venue ───────────────────────────────────────────────────────────────

  console.log("\n── Venue ──");

  let venueId: string;
  if (!SKIP_LOOKUP) {
    const existing = await lookupExisting(venueData.name, [T("ballpark")], [
      { propKey: "mlb_id", value: venueData.id },
    ]);
    if (existing) {
      venueId = existing;
      console.log(`  ✓ ${venueData.name} (exists)`);
      stats.found++;
    } else {
      venueId = "";
    }
  } else {
    venueId = "";
  }

  if (!venueId) {
    const values: any[] = [
      { propKey: "mlb_id", value: venueData.id },
    ];
    if (venueData.fieldInfo?.capacity) values.push({ propKey: "capacity", value: venueData.fieldInfo.capacity });
    if (venueData.fieldInfo?.leftLine) values.push({ propKey: "left_field_distance", value: venueData.fieldInfo.leftLine });
    if (venueData.fieldInfo?.center) values.push({ propKey: "center_field_distance", value: venueData.fieldInfo.center });
    if (venueData.fieldInfo?.rightLine) values.push({ propKey: "right_field_distance", value: venueData.fieldInfo.rightLine });

    const relations: Record<string, any> = {};

    if (venueData.fieldInfo?.turfType) {
      const { id } = await getOrCreateRef("surface_type", venueData.fieldInfo.turfType, undefined, SKIP_LOOKUP);
      relations[P("surface_type")] = { toEntity: id };
    }
    if (venueData.fieldInfo?.roofType) {
      const { id, ops } = await getOrCreateRef("roof_type", venueData.fieldInfo.roofType, undefined, SKIP_LOOKUP);
      allOps.push(...ops);
      relations[P("roof_type")] = { toEntity: id };
    }

    const result = createEntityOps({
      name: venueData.name,
      description: `${venueData.location?.city ?? ""}, ${venueData.location?.stateAbbrev ?? ""}`,
      types: [T("ballpark")],
      values,
      relations,
    });
    venueId = result.id;
    addOps(result.ops);
    console.log(`  + ${venueData.name}`);
  }

  // ── People ──────────────────────────────────────────────────────────────

  console.log("\n── People ──");

  const playerIdMap = new Map<number, string>(); // MLB ID → Geo entity ID

  async function getOrCreatePerson(mlbId: number, fullName: string, extraValues?: Array<{ propKey: string; value: any }>): Promise<string> {
    if (playerIdMap.has(mlbId)) return playerIdMap.get(mlbId)!;

    const values = [
      { propKey: "mlb_id", value: mlbId },
      ...(extraValues ?? []),
    ];

    if (!SKIP_LOOKUP) {
      const existing = await lookupExisting(fullName, [T("person")], values);
      if (existing) {
        playerIdMap.set(mlbId, existing);
        stats.found++;
        return existing;
      }
    }

    // Get bio from gameData.players
    const playerData = gameData.players?.[`ID${mlbId}`];
    const personValues: Array<{ propKey: string; value: any }> = [
      { propKey: "mlb_id", value: mlbId },
    ];
    if (playerData?.height) {
      // Parse "6' 4\"" → inches
      const match = playerData.height.match(/(\d+)'\s*(\d+)/);
      if (match) personValues.push({ propKey: "height_inches", value: parseInt(match[1]) * 12 + parseInt(match[2]) });
    }
    if (playerData?.weight) personValues.push({ propKey: "weight_lbs", value: playerData.weight });

    const relations: Record<string, any> = {};

    // Bats / Throws
    if (playerData?.batSide?.description) {
      const batName = playerData.batSide.code === "S" ? "Switch" : playerData.batSide.description;
      const { id, ops } = await getOrCreateRef("handedness", batName, undefined, SKIP_LOOKUP);
      allOps.push(...ops);
      relations[P("bats")] = { toEntity: id };
    }
    if (playerData?.pitchHand?.description) {
      const { id, ops } = await getOrCreateRef("handedness", playerData.pitchHand.description, undefined, SKIP_LOOKUP);
      allOps.push(...ops);
      relations[P("throws")] = { toEntity: id };
    }

    // Role
    const { id: roleId, ops: roleOps } = await getOrCreateRef("role", "Player", undefined, SKIP_LOOKUP);
    allOps.push(...roleOps);
    relations[P("role")] = { toEntity: roleId };

    const result = createEntityOps({
      name: fullName,
      types: [T("person")],
      values: personValues,
      relations,
    });
    playerIdMap.set(mlbId, result.id);
    addOps(result.ops);
    return result.id;
  }

  // Pre-create all players from boxscore
  for (const side of ["away", "home"]) {
    const players = boxscore.teams[side].players ?? {};
    for (const [, playerObj] of Object.entries(players) as [string, any][]) {
      await getOrCreatePerson(playerObj.person.id, playerObj.person.fullName);
    }
  }
  console.log(`  ${playerIdMap.size} players processed`);

  // ── Game ────────────────────────────────────────────────────────────────

  console.log("\n── Game ──");

  const awayScore = liveData.linescore?.teams?.away?.runs ?? null;
  const homeScore = liveData.linescore?.teams?.home?.runs ?? null;
  const gameName = `${awayAbbrev} @ ${homeAbbrev} — ${gameDate}`;
  const gameDesc = awayScore != null ? `${awayAbbrev} ${awayScore}, ${homeAbbrev} ${homeScore}` : "";

  const gameValues: Array<{ propKey: string; value: any }> = [
    { propKey: "mlb_game_pk", value: GAME_PK },
    { propKey: "game_date", value: gameDate },
    { propKey: "game_number", value: 0 },
  ];
  if (awayScore != null) gameValues.push({ propKey: "away_score", value: awayScore });
  if (homeScore != null) gameValues.push({ propKey: "home_score", value: homeScore });
  if (gameInfo.attendance) gameValues.push({ propKey: "attendance", value: gameInfo.attendance });
  if (gameInfo.gameDurationMinutes) gameValues.push({ propKey: "duration_minutes", value: gameInfo.gameDurationMinutes });
  if (weather.temp) gameValues.push({ propKey: "temperature", value: parseFloat(weather.temp) });
  if (weather.wind) gameValues.push({ propKey: "wind", value: weather.wind });

  // Day/Night
  const dayNight = gameData.datetime?.dayNight;
  if (dayNight) gameValues.push({ propKey: "day_game", value: dayNight === "day" });

  const gameRelations: Record<string, any> = {
    [P("away_team")]: { toEntity: awayTeamId },
    [P("home_team")]: { toEntity: homeTeamId },
    [P("venue")]: { toEntity: venueId },
    [P("season")]: { toEntity: seasonId },
  };

  // Game type
  const { id: gameTypeId, ops: gtOps } = await getOrCreateRef("game_type", "Regular Season", undefined, SKIP_LOOKUP);
  allOps.push(...gtOps);
  gameRelations[P("game_type")] = { toEntity: gameTypeId };

  // Sky condition
  if (weather.condition) {
    const { id, ops } = await getOrCreateRef("sky_condition", weather.condition, undefined, SKIP_LOOKUP);
    allOps.push(...ops);
    gameRelations[P("sky_conditions")] = { toEntity: id };
  }

  // Pitching decisions
  if (decisions.winner?.id) {
    const wpId = await getOrCreatePerson(decisions.winner.id, decisions.winner.fullName);
    gameRelations[P("winning_pitcher")] = { toEntity: wpId };
  }
  if (decisions.loser?.id) {
    const lpId = await getOrCreatePerson(decisions.loser.id, decisions.loser.fullName);
    gameRelations[P("losing_pitcher")] = { toEntity: lpId };
  }
  if (decisions.save?.id) {
    const svId = await getOrCreatePerson(decisions.save.id, decisions.save.fullName);
    gameRelations[P("save_pitcher")] = { toEntity: svId };
  }

  // Probable pitchers
  if (gameData.probablePitchers?.away?.id) {
    const id = await getOrCreatePerson(gameData.probablePitchers.away.id, gameData.probablePitchers.away.fullName);
    gameRelations[P("away_starting_pitcher")] = { toEntity: id };
  }
  if (gameData.probablePitchers?.home?.id) {
    const id = await getOrCreatePerson(gameData.probablePitchers.home.id, gameData.probablePitchers.home.fullName);
    gameRelations[P("home_starting_pitcher")] = { toEntity: id };
  }

  const gameResult = createEntityOps({
    name: gameName,
    description: gameDesc,
    types: [T("game")],
    values: gameValues,
    relations: gameRelations,
  });
  const gameId = gameResult.id;
  addOps(gameResult.ops);
  console.log(`  + ${gameName}`);

  // ── Plays & Pitches ─────────────────────────────────────────────────────

  console.log("\n── Plays & Pitches ──");
  let playCount = 0;
  let pitchCount = 0;

  for (const play of plays) {
    const result = play.result ?? {};
    const about = play.about ?? {};
    const matchup = play.matchup ?? {};

    if (!result.event) continue;

    const batterId = await getOrCreatePerson(matchup.batter.id, matchup.batter.fullName);
    const pitcherId = await getOrCreatePerson(matchup.pitcher.id, matchup.pitcher.fullName);

    // Event reference entity
    const { id: eventId, ops: eventOps } = await getOrCreateRef("play_event", result.event, undefined, SKIP_LOOKUP);
    allOps.push(...eventOps);

    // Batting/Pitching team
    const isTopInning = about.halfInning === "top";
    const battingTeamId = isTopInning ? awayTeamId : homeTeamId;
    const pitchingTeamId = isTopInning ? homeTeamId : awayTeamId;

    const playValues: Array<{ propKey: string; value: any }> = [
      { propKey: "inning", value: about.inning ?? 0 },
      { propKey: "top_of_inning", value: isTopInning },
      { propKey: "at_bat_index", value: play.atBatIndex ?? 0 },
      { propKey: "rbi", value: result.rbi ?? 0 },
      { propKey: "is_scoring_play", value: about.isScoringPlay ?? false },
    ];

    const playName = `${matchup.batter.fullName} vs ${matchup.pitcher.fullName} — ${result.event}`;

    const playResult = createEntityOps({
      name: playName,
      description: result.description,
      types: [T("play")],
      values: playValues,
      relations: {
        [P("game")]: { toEntity: gameId },
        [P("batter")]: { toEntity: batterId },
        [P("pitcher")]: { toEntity: pitcherId },
        [P("batting_team")]: { toEntity: battingTeamId },
        [P("pitching_team")]: { toEntity: pitchingTeamId },
        [P("event")]: { toEntity: eventId },
      },
    });
    const playId = playResult.id;
    allOps.push(...playResult.ops);
    playCount++;

    // Pitches for this play
    const pitchEvents = (play.playEvents ?? []).filter((e: any) => e.isPitch);
    for (const pe of pitchEvents) {
      const pitchData = pe.pitchData ?? {};
      const hitData = pe.hitData ?? {};
      const details = pe.details ?? {};

      const pitchValues: Array<{ propKey: string; value: any }> = [
        { propKey: "pitch_number", value: pe.pitchNumber ?? 0 },
      ];

      if (pitchData.startSpeed) pitchValues.push({ propKey: "start_speed", value: pitchData.startSpeed });
      if (pitchData.endSpeed) pitchValues.push({ propKey: "end_speed", value: pitchData.endSpeed });
      if (pitchData.breaks?.spinRate) pitchValues.push({ propKey: "spin_rate", value: pitchData.breaks.spinRate });
      if (pitchData.breaks?.spinDirection) pitchValues.push({ propKey: "spin_direction", value: pitchData.breaks.spinDirection });
      if (pitchData.zone) pitchValues.push({ propKey: "strike_zone", value: pitchData.zone });
      if (pitchData.coordinates?.pX != null) pitchValues.push({ propKey: "plate_x", value: pitchData.coordinates.pX });
      if (pitchData.coordinates?.pZ != null) pitchValues.push({ propKey: "plate_z", value: pitchData.coordinates.pZ });
      if (hitData.launchSpeed) pitchValues.push({ propKey: "launch_speed", value: hitData.launchSpeed });
      if (hitData.launchAngle != null) pitchValues.push({ propKey: "launch_angle", value: hitData.launchAngle });
      if (hitData.totalDistance) pitchValues.push({ propKey: "hit_distance", value: hitData.totalDistance });

      const pitchRelations: Record<string, any> = {
        [P("play")]: { toEntity: playId },
        [P("game")]: { toEntity: gameId },
        [P("pitcher")]: { toEntity: pitcherId },
        [P("batter")]: { toEntity: batterId },
      };

      // Pitch type
      const pitchTypeName = details.type?.description;
      if (pitchTypeName) {
        const { id, ops } = await getOrCreateRef("pitch_type", pitchTypeName, undefined, SKIP_LOOKUP);
        allOps.push(...ops);
        pitchRelations[P("pitch_type")] = { toEntity: id };
      }

      // Pitch call
      const pitchCallName = details.description;
      if (pitchCallName) {
        const { id, ops } = await getOrCreateRef("pitch_call", pitchCallName, undefined, SKIP_LOOKUP);
        allOps.push(...ops);
        pitchRelations[P("pitch_call")] = { toEntity: id };
      }

      // Hit trajectory
      if (hitData.trajectory) {
        const trajName = hitData.trajectory
          .replace("_", " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase()); // "fly_ball" → "Fly Ball"
        const { id, ops } = await getOrCreateRef("hit_trajectory", trajName, undefined, SKIP_LOOKUP);
        allOps.push(...ops);
        pitchRelations[P("hit_trajectory")] = { toEntity: id };
      }

      const pitchName = `Pitch #${pe.pitchNumber ?? 0} — ${pitchTypeName ?? "Unknown"}`;
      const pitchResult = createEntityOps({
        name: pitchName,
        description: pitchCallName,
        types: [T("pitch")],
        values: pitchValues,
        relations: pitchRelations,
      });
      allOps.push(...pitchResult.ops);
      pitchCount++;
    }
  }

  console.log(`  ${playCount} plays, ${pitchCount} pitches`);

  // ── Batting Performances ────────────────────────────────────────────────

  console.log("\n── Batting Performances ──");
  let batCount = 0;

  for (const side of ["away", "home"]) {
    const teamId = side === "away" ? awayTeamId : homeTeamId;
    const players = boxscore.teams[side].players ?? {};

    for (const [, playerObj] of Object.entries(players) as [string, any][]) {
      const batting = playerObj.stats?.batting;
      if (!batting || (!batting.atBats && !batting.plateAppearances)) continue;

      const personId = await getOrCreatePerson(playerObj.person.id, playerObj.person.fullName);
      const values: Array<{ propKey: string; value: any }> = [];

      if (batting.plateAppearances != null) values.push({ propKey: "plate_appearances", value: batting.plateAppearances });
      if (batting.atBats != null) values.push({ propKey: "at_bats", value: batting.atBats });
      if (batting.runs != null) values.push({ propKey: "runs", value: batting.runs });
      if (batting.hits != null) values.push({ propKey: "hits", value: batting.hits });
      if (batting.doubles != null) values.push({ propKey: "doubles", value: batting.doubles });
      if (batting.triples != null) values.push({ propKey: "triples", value: batting.triples });
      if (batting.homeRuns != null) values.push({ propKey: "home_runs", value: batting.homeRuns });
      if (batting.rbi != null) values.push({ propKey: "rbi", value: batting.rbi });
      if (batting.baseOnBalls != null) values.push({ propKey: "walks", value: batting.baseOnBalls });
      if (batting.intentionalWalks != null) values.push({ propKey: "intentional_walks", value: batting.intentionalWalks });
      if (batting.strikeOuts != null) values.push({ propKey: "strikeouts", value: batting.strikeOuts });
      if (batting.stolenBases != null) values.push({ propKey: "stolen_bases", value: batting.stolenBases });
      if (batting.caughtStealing != null) values.push({ propKey: "caught_stealing", value: batting.caughtStealing });
      if (batting.hitByPitch != null) values.push({ propKey: "hit_by_pitch", value: batting.hitByPitch });
      if (batting.sacBunts != null) values.push({ propKey: "sacrifice_hits", value: batting.sacBunts });
      if (batting.sacFlies != null) values.push({ propKey: "sacrifice_flies", value: batting.sacFlies });
      if (batting.groundIntoDoublePlay != null) values.push({ propKey: "grounded_into_dp", value: batting.groundIntoDoublePlay });

      const isDH = playerObj.position?.abbreviation === "DH";
      values.push({ propKey: "is_designated_hitter", value: isDH });

      const perfName = `${playerObj.person.fullName} — ${gameDate}`;
      const desc = batting.summary ?? `${batting.hits}-for-${batting.atBats}`;

      const result = createEntityOps({
        name: perfName,
        description: desc,
        types: [T("batting_performance")],
        values,
        relations: {
          [P("player")]: { toEntity: personId },
          [P("game")]: { toEntity: gameId },
          [P("team")]: { toEntity: teamId },
          [P("season")]: { toEntity: seasonId },
        },
      });
      allOps.push(...result.ops);
      batCount++;
    }
  }
  console.log(`  ${batCount} batting performances`);

  // ── Pitching Performances ───────────────────────────────────────────────

  console.log("\n── Pitching Performances ──");
  let pitchPerfCount = 0;

  for (const side of ["away", "home"]) {
    const teamId = side === "away" ? awayTeamId : homeTeamId;
    const players = boxscore.teams[side].players ?? {};

    for (const [, playerObj] of Object.entries(players) as [string, any][]) {
      const pitching = playerObj.stats?.pitching;
      if (!pitching?.inningsPitched) continue;

      const personId = await getOrCreatePerson(playerObj.person.id, playerObj.person.fullName);
      const values: Array<{ propKey: string; value: any }> = [];

      // Convert "6.2" string to float
      const ip = parseFloat(pitching.inningsPitched);
      if (!isNaN(ip)) values.push({ propKey: "innings_pitched", value: ip });

      if (pitching.hits != null) values.push({ propKey: "hits_allowed", value: pitching.hits });
      if (pitching.runs != null) values.push({ propKey: "runs_allowed", value: pitching.runs });
      if (pitching.earnedRuns != null) values.push({ propKey: "earned_runs", value: pitching.earnedRuns });
      if (pitching.homeRuns != null) values.push({ propKey: "home_runs_allowed", value: pitching.homeRuns });
      if (pitching.baseOnBalls != null) values.push({ propKey: "walks_issued", value: pitching.baseOnBalls });
      if (pitching.strikeOuts != null) values.push({ propKey: "strikeouts", value: pitching.strikeOuts });
      if (pitching.battersFaced != null) values.push({ propKey: "batters_faced", value: pitching.battersFaced });
      if (pitching.pitchesThrown != null) values.push({ propKey: "pitches_thrown", value: pitching.pitchesThrown });
      if (pitching.wildPitches != null) values.push({ propKey: "wild_pitches", value: pitching.wildPitches });
      if (pitching.balks != null) values.push({ propKey: "balks", value: pitching.balks });

      values.push({ propKey: "game_started", value: (pitching.gamesStarted ?? 0) > 0 });
      values.push({ propKey: "complete_game", value: (pitching.completeGames ?? 0) > 0 });
      values.push({ propKey: "shutout", value: (pitching.shutouts ?? 0) > 0 });
      values.push({ propKey: "win", value: (pitching.wins ?? 0) > 0 });
      values.push({ propKey: "loss", value: (pitching.losses ?? 0) > 0 });
      values.push({ propKey: "save", value: (pitching.saves ?? 0) > 0 });

      const perfName = `${playerObj.person.fullName} — ${gameDate}`;
      const desc = pitching.summary ?? `${pitching.inningsPitched} IP`;

      const result = createEntityOps({
        name: perfName,
        description: desc,
        types: [T("pitching_performance")],
        values,
        relations: {
          [P("player")]: { toEntity: personId },
          [P("game")]: { toEntity: gameId },
          [P("team")]: { toEntity: teamId },
          [P("season")]: { toEntity: seasonId },
        },
      });
      allOps.push(...result.ops);
      pitchPerfCount++;
    }
  }
  console.log(`  ${pitchPerfCount} pitching performances`);

  // ── Fielding Performances ───────────────────────────────────────────────

  console.log("\n── Fielding Performances ──");
  let fieldCount = 0;

  for (const side of ["away", "home"]) {
    const teamId = side === "away" ? awayTeamId : homeTeamId;
    const players = boxscore.teams[side].players ?? {};

    for (const [, playerObj] of Object.entries(players) as [string, any][]) {
      const fielding = playerObj.stats?.fielding;
      if (!fielding || (fielding.putOuts === 0 && fielding.assists === 0 && fielding.chances === 0)) continue;

      const personId = await getOrCreatePerson(playerObj.person.id, playerObj.person.fullName);
      const values: Array<{ propKey: string; value: any }> = [];

      if (fielding.putOuts != null) values.push({ propKey: "putouts", value: fielding.putOuts });
      if (fielding.assists != null) values.push({ propKey: "assists", value: fielding.assists });
      if (fielding.errors != null) values.push({ propKey: "errors", value: fielding.errors });

      const relations: Record<string, any> = {
        [P("player")]: { toEntity: personId },
        [P("game")]: { toEntity: gameId },
        [P("team")]: { toEntity: teamId },
        [P("season")]: { toEntity: seasonId },
      };

      // Position
      const posName = playerObj.position?.name;
      if (posName) {
        const { id, ops } = await getOrCreateRef("position", posName, undefined, SKIP_LOOKUP);
        allOps.push(...ops);
        relations[P("fielding_position")] = { toEntity: id };
      }

      const posAbbrev = playerObj.position?.abbreviation ?? "?";
      const perfName = `${playerObj.person.fullName} (${posAbbrev}) — ${gameDate}`;

      const result = createEntityOps({
        name: perfName,
        types: [T("fielding_performance")],
        values,
        relations,
      });
      allOps.push(...result.ops);
      fieldCount++;
    }
  }
  console.log(`  ${fieldCount} fielding performances`);

  // ── Summary & Publish ───────────────────────────────────────────────────

  console.log(`\n── Summary ──`);
  console.log(`  Entities: ${stats.created} created, ${stats.found} found existing`);
  console.log(`  Total ops: ${allOps.length}`);

  if (allOps.length === 0) {
    console.log("\n  Nothing to publish.");
    return;
  }

  if (DRY_RUN) {
    console.log("\n── Dry run — writing ops to file ──");
    printOps(allOps, ".", `game_${GAME_PK}_ops.json`);
  } else {
    console.log("\n── Publishing to Geo ──");
    await publishOps(allOps, `Game ${GAME_PK}: ${gameName}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

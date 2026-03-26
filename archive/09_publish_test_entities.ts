/**
 * Publish Test Entities
 *
 * Creates a small set of test entities across all ontology types so the
 * schema can be navigated and verified in the Geo browser.
 *
 * Includes:
 *   - Reference entities (Handedness, Positions, Leagues, Game Types, etc.)
 *   - 2 teams, 1 ballpark, 1 season
 *   - 4 people (2 batters, 1 pitcher, 1 umpire)
 *   - 1 game with relations to all of the above
 *   - 2 plays within that game
 *   - 1 pitch on one of the plays
 *   - 1 batting performance, 1 pitching performance, 1 fielding performance
 *   - 1 roster entry
 *
 * Before creating each entity, the script checks the API for existing matches:
 *   1. By Retrosheet ID (text property value match)
 *   2. By MLB ID (integer property value match)
 *   3. By exact name + type match
 * If found, the existing entity ID is reused (createEntity upserts).
 *
 * Usage:
 *   bun run 09_publish_test_entities.ts              # publish (with lookups)
 *   bun run 09_publish_test_entities.ts --dry-run    # preview without publishing
 *   bun run 09_publish_test_entities.ts --skip-lookup # publish without API lookups
 */

import { Graph, IdUtils, type Op } from "@geoprotocol/geo-sdk";
import {
  publishOps,
  printOps,
  findEntityByName,
  findEntityByTextValue,
  findEntityByIntegerValue,
} from "./src/functions";
import ontology from "./src/ontology.json";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_LOOKUP = process.argv.includes("--skip-lookup");

// ── Helpers ─────────────────────────────────────────────────────────────────

const T = (key: string) => (ontology.types as any)[key].id;
const P = (key: string) => (ontology.properties as any)[key].id;

// Lookup dataType for a property key to auto-type values
const propDataType = (key: string): string => {
  const p = (ontology.properties as any)[key];
  return p?.dataType ?? "TEXT";
};

// Map ontology dataType to SDK TypedValue type
const SDK_TYPE_MAP: Record<string, string> = {
  TEXT: "text", INTEGER: "integer", FLOAT: "float", BOOLEAN: "boolean",
  DATE: "date", DATETIME: "datetime", TIME: "time", POINT: "point",
};

// Build a typed value param from property key + raw value
function val(propKey: string, value: any): any {
  const dt = propDataType(propKey);
  const sdkType = SDK_TYPE_MAP[dt];
  if (!sdkType) throw new Error(`Unsupported dataType "${dt}" for property "${propKey}"`);
  return { property: P(propKey), type: sdkType, value };
}

function entity(
  opts: {
    id?: string;
    name: string;
    description?: string;
    types: string[];
    values?: Array<{ propKey: string; value: any }>;
    relations?: Record<string, { toEntity: string } | Array<{ toEntity: string }>>;
  }
): Op[] {
  const params: any = {
    id: opts.id ?? IdUtils.generate(),
    name: opts.name,
    description: opts.description,
    types: opts.types,
    values: opts.values?.map(v => val(v.propKey, v.value)),
    relations: opts.relations,
  };

  const { ops } = Graph.createEntity(params);
  return ops;
}

/**
 * Check if an entity already exists before creating it.
 * Lookup strategy (in order):
 *   1. By Retrosheet ID (if provided in values)
 *   2. By MLB ID (if provided in values)
 *   3. By exact name + type match
 * Returns the existing entity ID if found, or null to proceed with creation.
 */
async function lookupExisting(
  name: string,
  types: string[],
  values?: Array<{ propKey: string; value: any }>,
): Promise<string | null> {
  if (SKIP_LOOKUP || DRY_RUN) return null;

  // Check by Retrosheet ID
  const rsId = values?.find(v => v.propKey === "retrosheet_id");
  if (rsId) {
    const found = await findEntityByTextValue(P("retrosheet_id"), rsId.value as string);
    if (found) {
      console.log(`    Found by Retrosheet ID "${rsId.value}": ${found}`);
      return found;
    }
  }

  // Check by MLB ID
  const mlbId = values?.find(v => v.propKey === "mlb_id");
  if (mlbId) {
    const found = await findEntityByIntegerValue(P("mlb_id"), mlbId.value as number);
    if (found) {
      console.log(`    Found by MLB ID ${mlbId.value}: ${found}`);
      return found;
    }
  }

  // Check by name + type
  if (types.length > 0) {
    const found = await findEntityByName(name, types[0]);
    if (found) {
      console.log(`    Found by name "${name}": ${found}`);
      return found;
    }
  }

  return null;
}

// ── Stable test entity IDs (so re-runs update rather than duplicate) ────────

const IDS = {
  // Reference entities
  hand_left:     "e79fae8a002045dda6ec6e5dd8aab5a1",
  hand_right:    "710568d87345470c9cc7db486db56a25",
  hand_switch:   "f095d26410ca4621bf3d30fdd3dccf6a",
  pos_pitcher:   "e4a9028be8994d83bb470c43f7fce5f2",
  pos_catcher:   "e0a103c680eb495d8883d5fa7dcd54e9",
  pos_first:     "af16906669104f2aa512dc2a6842b27b",
  pos_short:     "01e74dea28974510bb6f8b663b8ec84d",
  pos_left:      "dfb5002dec3c4f6b92d61aa351f1ed44",
  pos_center:    "aad439bf54544960907fd6d2f65ada0c",
  pos_right:     "2d48c0a57a2f473b934a08552178a762",
  pos_dh:        "357d2e8cadcc4961bf07b30ee6d40759",
  league_al:     "80cf1f9e173b48909eb6708593b85144",
  league_nl:     "014dc515297b48708ab99d79bc9401dc",
  gametype_reg:  "63ce5ef42a214533b39a859e917b89ea",
  gametype_ws:   "a70c074b69154de4a9bac7b9505ec38d",
  role_player:   "b868c754c9464d368fcc5d87d567d56e",
  role_manager:  "313aff61723f46dfa93c040ba1e182ea",
  role_umpire:   "e7fbead57a28440681d24444c73a3702",
  sky_sunny:     "e72aa42ebf9649b4beaf74e5c64a8612",
  sky_dome:      "d177bd99bfbb438f9b3401f711b2ac93",
  surf_grass:    "5a59a7f3e81b43ac94efadca8735b0c3",
  roof_open:     "ff50401e4cf943e78155b0e2af7a0d26",
  roof_retract:  "1d5abb66d85f4e96ae9984576c206afa",
  event_hr:      "cdca047d0c354129814fd6852cf466eb",
  event_k:       "a92cd78c98de4b53a656ec9d0dd58e43",
  event_single:  "c3e4804aec2b41c8a2e75866fc92f4be",
  pitchtype_ff:  "374702487c2e4e0a95722c0f2c713e39",
  pitchtype_sl:  "1a9f6120b0e3413da3fe293a5c4663ad",
  call_ball:     "17dce467dd89488f9b7463475601f5e6",
  call_swstr:    "51cf48d8ac8a45618d9e2cc96967404c",
  call_inplay:   "8814cef84957476d92580fba1edd3ec3",
  traj_fly:      "ba1f1e36bb734ce49912592a046722be",
  traj_ground:   "adf01386c3fb4311a1ea82ac803b5580",
  // Country / State / City
  country_usa:   "92f93335645d47bdb0af0b1a1d960ff4",
  country_japan: "9150f6aa205b4f4892b4d96a86101d79",
  state_oh:      "486a8b830c2e4dda884b5734c05315a7",
  state_ny:      "7a164e246b564e58962003b93ca6e999",
  city_cin:      "e3a428b5fca54e26a4db96afae960e69",
  city_nyc:      "c2f5a26658464ae7b9e3205fe0bd46ae",
  // Domain entities
  season_2025:   "89476558dc41413291239d5b7dd5dbe2",
  team_cin:      "02eb29024a5c44e8ab8a65b5b27c7542",
  team_nyy:      "7ebcfcb79df641f2972fafffb4e53ed5",
  park_gabp:     "1c89db57cfb948f6b3613f36f29f3e4e",
  person_ohtani: "a03c2d5bc5484b1883d7ef104992552c",
  person_judge:  "dedb199b2d2c4f5e924be0f7c0fb24c6",
  person_cole:   "156301724ded4e41a21d8aab164e6c92",
  person_ump:    "8169250cd2164501a1c701d061218606",
  game_test:     "6f4bc8bca4eb4baea01ce1a2236210e9",
  play_hr:       "75cef3479bf64ae6b5f7814e61ddf7a3",
  play_k:        "130353c34f2e4d20a662519a237f11ff",
  pitch_test:    "3547ad20ef054fbe852b27e0196209d1",
  bat_perf:      "fdae709157fa4446be5bb4d7c28c7617",
  pitch_perf:    "f0a82efcad2944d38493d29cd1a75e0d",
  field_perf:    "8b7edfe63ac84f738afa5e534149aa37",
  roster_ohtani: "914d96a5dfa743e094235c2f4159ae77",
};

async function main() {
  const allOps: Op[] = [];

  // ── Reference entities ──────────────────────────────────────────────────

  console.log("── Reference entities ──");

  // Handedness
  allOps.push(...entity({ id: IDS.hand_left, name: "Left", description: "Left-handed", types: [T("handedness")] }));
  allOps.push(...entity({ id: IDS.hand_right, name: "Right", description: "Right-handed", types: [T("handedness")] }));
  allOps.push(...entity({ id: IDS.hand_switch, name: "Switch", description: "Switch hitter (bats both sides)", types: [T("handedness")] }));

  // Positions (subset)
  allOps.push(...entity({ id: IDS.pos_pitcher, name: "Pitcher", description: "Defensive position 1 (P)", types: [T("position")] }));
  allOps.push(...entity({ id: IDS.pos_catcher, name: "Catcher", description: "Defensive position 2 (C)", types: [T("position")] }));
  allOps.push(...entity({ id: IDS.pos_first, name: "First Base", description: "Defensive position 3 (1B)", types: [T("position")] }));
  allOps.push(...entity({ id: IDS.pos_short, name: "Shortstop", description: "Defensive position 6 (SS)", types: [T("position")] }));
  allOps.push(...entity({ id: IDS.pos_left, name: "Left Field", description: "Defensive position 7 (LF)", types: [T("position")] }));
  allOps.push(...entity({ id: IDS.pos_center, name: "Center Field", description: "Defensive position 8 (CF)", types: [T("position")] }));
  allOps.push(...entity({ id: IDS.pos_right, name: "Right Field", description: "Defensive position 9 (RF)", types: [T("position")] }));
  allOps.push(...entity({ id: IDS.pos_dh, name: "Designated Hitter", description: "Designated hitter (DH)", types: [T("position")] }));

  // Leagues
  allOps.push(...entity({ id: IDS.league_al, name: "American League", description: "AL — founded 1901", types: [T("league")] }));
  allOps.push(...entity({ id: IDS.league_nl, name: "National League", description: "NL — founded 1876", types: [T("league")] }));

  // Game Types
  allOps.push(...entity({ id: IDS.gametype_reg, name: "Regular Season", description: "Standard 162-game regular season", types: [T("game_type")] }));
  allOps.push(...entity({ id: IDS.gametype_ws, name: "World Series", description: "Championship series between AL and NL pennant winners", types: [T("game_type")] }));

  // Roles
  allOps.push(...entity({ id: IDS.role_player, name: "Player", description: "Active roster player", types: [T("role")] }));
  allOps.push(...entity({ id: IDS.role_manager, name: "Manager", description: "Team manager", types: [T("role")] }));
  allOps.push(...entity({ id: IDS.role_umpire, name: "Umpire", description: "Game umpire", types: [T("role")] }));

  // Sky Conditions
  allOps.push(...entity({ id: IDS.sky_sunny, name: "Sunny", types: [T("sky_condition")] }));
  allOps.push(...entity({ id: IDS.sky_dome, name: "Dome", types: [T("sky_condition")] }));

  // Surface & Roof
  allOps.push(...entity({ id: IDS.surf_grass, name: "Grass", types: [T("surface_type")] }));
  allOps.push(...entity({ id: IDS.roof_open, name: "Open", types: [T("roof_type")] }));
  allOps.push(...entity({ id: IDS.roof_retract, name: "Retractable", types: [T("roof_type")] }));

  // Play Events
  allOps.push(...entity({ id: IDS.event_hr, name: "Home Run", types: [T("play_event")] }));
  allOps.push(...entity({ id: IDS.event_k, name: "Strikeout", types: [T("play_event")] }));
  allOps.push(...entity({ id: IDS.event_single, name: "Single", types: [T("play_event")] }));

  // Pitch Types
  allOps.push(...entity({ id: IDS.pitchtype_ff, name: "Four-Seam Fastball", types: [T("pitch_type")] }));
  allOps.push(...entity({ id: IDS.pitchtype_sl, name: "Slider", types: [T("pitch_type")] }));

  // Pitch Calls
  allOps.push(...entity({ id: IDS.call_ball, name: "Ball", types: [T("pitch_call")] }));
  allOps.push(...entity({ id: IDS.call_swstr, name: "Swinging Strike", types: [T("pitch_call")] }));
  allOps.push(...entity({ id: IDS.call_inplay, name: "In Play, No Out", types: [T("pitch_call")] }));

  // Hit Trajectories
  allOps.push(...entity({ id: IDS.traj_fly, name: "Fly Ball", types: [T("hit_trajectory")] }));
  allOps.push(...entity({ id: IDS.traj_ground, name: "Ground Ball", types: [T("hit_trajectory")] }));

  console.log("  Reference entities created");

  // ── Geography ───────────────────────────────────────────────────────────

  console.log("── Geography ──");

  allOps.push(...entity({
    id: IDS.country_usa, name: "USA", description: "United States of America",
    types: [T("country")],
  }));
  allOps.push(...entity({
    id: IDS.country_japan, name: "Japan",
    types: [T("country")],
  }));
  allOps.push(...entity({
    id: IDS.state_oh, name: "Ohio",
    types: [T("state")],
    relations: { [P("country")]: { toEntity: IDS.country_usa } },
  }));
  allOps.push(...entity({
    id: IDS.state_ny, name: "New York",
    types: [T("state")],
    relations: { [P("country")]: { toEntity: IDS.country_usa } },
  }));
  allOps.push(...entity({
    id: IDS.city_cin, name: "Cincinnati",
    types: [T("city")],
    relations: {
      [P("state")]: { toEntity: IDS.state_oh },
      [P("country")]: { toEntity: IDS.country_usa },
    },
  }));
  allOps.push(...entity({
    id: IDS.city_nyc, name: "New York City",
    types: [T("city")],
    relations: {
      [P("state")]: { toEntity: IDS.state_ny },
      [P("country")]: { toEntity: IDS.country_usa },
    },
  }));

  console.log("  Geography created");

  // ── Season ──────────────────────────────────────────────────────────────

  console.log("── Season ──");

  allOps.push(...entity({
    id: IDS.season_2025, name: "2025 Season",
    types: [T("season")],
    values: [{ propKey: "year", value: 2025 }],
  }));

  // ── Teams ───────────────────────────────────────────────────────────────

  console.log("── Teams ──");

  allOps.push(...entity({
    id: IDS.team_cin, name: "Cincinnati Reds",
    description: "National League Central",
    types: [T("team")],
    values: [
      { propKey: "retrosheet_id", value: "CIN" },
      { propKey: "nickname", value: "Reds" },
      { propKey: "first_year", value: 1882 },
    ],
    relations: {
      [P("city")]: { toEntity: IDS.city_cin },
      [P("league")]: { toEntity: IDS.league_nl },
    },
  }));

  allOps.push(...entity({
    id: IDS.team_nyy, name: "New York Yankees",
    description: "American League East",
    types: [T("team")],
    values: [
      { propKey: "retrosheet_id", value: "NYA" },
      { propKey: "nickname", value: "Yankees" },
      { propKey: "first_year", value: 1903 },
    ],
    relations: {
      [P("city")]: { toEntity: IDS.city_nyc },
      [P("league")]: { toEntity: IDS.league_al },
    },
  }));

  // ── Ballpark ────────────────────────────────────────────────────────────

  console.log("── Ballpark ──");

  allOps.push(...entity({
    id: IDS.park_gabp, name: "Great American Ball Park",
    description: "Home of the Cincinnati Reds since 2003",
    types: [T("ballpark")],
    values: [
      { propKey: "retrosheet_id", value: "CIN09" },
      { propKey: "capacity", value: 42319 },
      { propKey: "left_field_distance", value: 328 },
      { propKey: "center_field_distance", value: 404 },
      { propKey: "right_field_distance", value: 325 },
    ],
    relations: {
      [P("city")]: { toEntity: IDS.city_cin },
      [P("state")]: { toEntity: IDS.state_oh },
      [P("surface_type")]: { toEntity: IDS.surf_grass },
      [P("roof_type")]: { toEntity: IDS.roof_open },
    },
  }));

  // ── People ──────────────────────────────────────────────────────────────

  console.log("── People ──");

  allOps.push(...entity({
    id: IDS.person_ohtani, name: "Shohei Ohtani",
    description: "Two-way player — pitcher and designated hitter",
    types: [T("person")],
    values: [
      { propKey: "retrosheet_id", value: "ohtas001" },
      { propKey: "mlb_id", value: 660271 },
      { propKey: "height_inches", value: 76 },
      { propKey: "weight_lbs", value: 210 },
      { propKey: "hall_of_fame", value: false },
    ],
    relations: {
      [P("bats")]: { toEntity: IDS.hand_left },
      [P("throws")]: { toEntity: IDS.hand_right },
      [P("birth_country")]: { toEntity: IDS.country_japan },
      [P("role")]: { toEntity: IDS.role_player },
    },
  }));

  allOps.push(...entity({
    id: IDS.person_judge, name: "Aaron Judge",
    description: "Outfielder, 2022 AL home run record holder (62)",
    types: [T("person")],
    values: [
      { propKey: "retrosheet_id", value: "judga001" },
      { propKey: "mlb_id", value: 592450 },
      { propKey: "height_inches", value: 79 },
      { propKey: "weight_lbs", value: 282 },
    ],
    relations: {
      [P("bats")]: { toEntity: IDS.hand_right },
      [P("throws")]: { toEntity: IDS.hand_right },
      [P("birth_state")]: { toEntity: IDS.state_oh },  // born in Linden, CA but using OH for test
      [P("birth_country")]: { toEntity: IDS.country_usa },
      [P("role")]: { toEntity: IDS.role_player },
    },
  }));

  allOps.push(...entity({
    id: IDS.person_cole, name: "Gerrit Cole",
    description: "Starting pitcher, 2023 AL Cy Young",
    types: [T("person")],
    values: [
      { propKey: "retrosheet_id", value: "coleg001" },
      { propKey: "mlb_id", value: 543037 },
    ],
    relations: {
      [P("throws")]: { toEntity: IDS.hand_right },
      [P("bats")]: { toEntity: IDS.hand_right },
      [P("birth_country")]: { toEntity: IDS.country_usa },
      [P("role")]: { toEntity: IDS.role_player },
    },
  }));

  allOps.push(...entity({
    id: IDS.person_ump, name: "Angel Hernandez",
    description: "MLB umpire (retired 2024)",
    types: [T("person")],
    values: [
      { propKey: "retrosheet_id", value: "herna901" },
    ],
    relations: {
      [P("birth_country")]: { toEntity: IDS.country_usa },
      [P("role")]: { toEntity: IDS.role_umpire },
    },
  }));

  // ── Game ────────────────────────────────────────────────────────────────

  console.log("── Game ──");

  allOps.push(...entity({
    id: IDS.game_test, name: "NYY @ CIN — 2025-04-15",
    description: "Test game: Yankees 3, Reds 5. WP: Cole, LP: Cole (intentionally paradoxical for testing)",
    types: [T("game")],
    values: [
      { propKey: "retrosheet_game_id", value: "CIN202504150" },
      { propKey: "mlb_game_pk", value: 999999 },
      { propKey: "game_date", value: "2025-04-15" },
      { propKey: "game_number", value: 0 },
      { propKey: "day_game", value: true },
      { propKey: "home_score", value: 5 },
      { propKey: "away_score", value: 3 },
      { propKey: "attendance", value: 38000 },
      { propKey: "duration_minutes", value: 185 },
      { propKey: "game_length_outs", value: 54 },
      { propKey: "temperature", value: 72.0 },
      { propKey: "wind", value: "8 mph, Out To CF" },
    ],
    relations: {
      [P("home_team")]: { toEntity: IDS.team_cin },
      [P("away_team")]: { toEntity: IDS.team_nyy },
      [P("venue")]: { toEntity: IDS.park_gabp },
      [P("season")]: { toEntity: IDS.season_2025 },
      [P("game_type")]: { toEntity: IDS.gametype_reg },
      [P("winning_pitcher")]: { toEntity: IDS.person_cole },
      [P("losing_pitcher")]: { toEntity: IDS.person_cole },
      [P("home_plate_umpire")]: { toEntity: IDS.person_ump },
      [P("sky_conditions")]: { toEntity: IDS.sky_sunny },
    },
  }));

  // ── Plays ───────────────────────────────────────────────────────────────

  console.log("── Plays ──");

  allOps.push(...entity({
    id: IDS.play_hr, name: "Ohtani vs Cole — Home Run",
    description: "Shohei Ohtani homers (12) on a fly ball to right center field. Aaron Judge scores.",
    types: [T("play")],
    values: [
      { propKey: "inning", value: 3 },
      { propKey: "top_of_inning", value: false },
      { propKey: "at_bat_index", value: 14 },
      { propKey: "rbi", value: 2 },
      { propKey: "is_scoring_play", value: true },
      { propKey: "outs_before", value: 1 },
      { propKey: "outs_after", value: 1 },
      { propKey: "balls", value: 2 },
      { propKey: "strikes", value: 1 },
    ],
    relations: {
      [P("game")]: { toEntity: IDS.game_test },
      [P("batter")]: { toEntity: IDS.person_ohtani },
      [P("pitcher")]: { toEntity: IDS.person_cole },
      [P("batting_team")]: { toEntity: IDS.team_cin },
      [P("pitching_team")]: { toEntity: IDS.team_nyy },
      [P("event")]: { toEntity: IDS.event_hr },
    },
  }));

  allOps.push(...entity({
    id: IDS.play_k, name: "Judge vs Cole — Strikeout",
    description: "Aaron Judge strikes out swinging.",
    types: [T("play")],
    values: [
      { propKey: "inning", value: 1 },
      { propKey: "top_of_inning", value: true },
      { propKey: "at_bat_index", value: 2 },
      { propKey: "rbi", value: 0 },
      { propKey: "is_scoring_play", value: false },
      { propKey: "outs_before", value: 0 },
      { propKey: "outs_after", value: 1 },
      { propKey: "balls", value: 1 },
      { propKey: "strikes", value: 3 },
    ],
    relations: {
      [P("game")]: { toEntity: IDS.game_test },
      [P("batter")]: { toEntity: IDS.person_judge },
      [P("pitcher")]: { toEntity: IDS.person_cole },
      [P("batting_team")]: { toEntity: IDS.team_nyy },
      [P("pitching_team")]: { toEntity: IDS.team_cin },
      [P("event")]: { toEntity: IDS.event_k },
    },
  }));

  // ── Pitch (Statcast) ───────────────────────────────────────────────────

  console.log("── Pitch ──");

  allOps.push(...entity({
    id: IDS.pitch_test, name: "Pitch #5 — Four-Seam Fastball",
    description: "The home run pitch — fastball middle-middle",
    types: [T("pitch")],
    values: [
      { propKey: "pitch_number", value: 5 },
      { propKey: "start_speed", value: 97.3 },
      { propKey: "end_speed", value: 88.1 },
      { propKey: "spin_rate", value: 2412 },
      { propKey: "spin_direction", value: 215 },
      { propKey: "strike_zone", value: 5 },
      { propKey: "plate_x", value: -0.12 },
      { propKey: "plate_z", value: 2.85 },
      { propKey: "launch_speed", value: 108.2 },
      { propKey: "launch_angle", value: 28.0 },
      { propKey: "hit_distance", value: 425.0 },
    ],
    relations: {
      [P("play")]: { toEntity: IDS.play_hr },
      [P("game")]: { toEntity: IDS.game_test },
      [P("pitcher")]: { toEntity: IDS.person_cole },
      [P("batter")]: { toEntity: IDS.person_ohtani },
      [P("pitch_type")]: { toEntity: IDS.pitchtype_ff },
      [P("pitch_call")]: { toEntity: IDS.call_inplay },
      [P("hit_trajectory")]: { toEntity: IDS.traj_fly },
    },
  }));

  // ── Performance records ────────────────────────────────────────────────

  console.log("── Performance records ──");

  allOps.push(...entity({
    id: IDS.bat_perf, name: "Ohtani — 2025-04-15",
    description: "2-for-4, 1 HR, 2 RBI",
    types: [T("batting_performance")],
    values: [
      { propKey: "lineup_position", value: 3 },
      { propKey: "plate_appearances", value: 5 },
      { propKey: "at_bats", value: 4 },
      { propKey: "runs", value: 1 },
      { propKey: "hits", value: 2 },
      { propKey: "doubles", value: 0 },
      { propKey: "triples", value: 0 },
      { propKey: "home_runs", value: 1 },
      { propKey: "rbi", value: 2 },
      { propKey: "walks", value: 1 },
      { propKey: "strikeouts", value: 1 },
      { propKey: "stolen_bases", value: 0 },
      { propKey: "is_designated_hitter", value: true },
    ],
    relations: {
      [P("player")]: { toEntity: IDS.person_ohtani },
      [P("game")]: { toEntity: IDS.game_test },
      [P("team")]: { toEntity: IDS.team_cin },
      [P("season")]: { toEntity: IDS.season_2025 },
    },
  }));

  allOps.push(...entity({
    id: IDS.pitch_perf, name: "Cole — 2025-04-15",
    description: "7.0 IP, 5 H, 3 ER, 9 K",
    types: [T("pitching_performance")],
    values: [
      { propKey: "pitching_sequence", value: 1 },
      { propKey: "innings_pitched", value: 7.0 },
      { propKey: "hits_allowed", value: 5 },
      { propKey: "runs_allowed", value: 3 },
      { propKey: "earned_runs", value: 3 },
      { propKey: "home_runs_allowed", value: 1 },
      { propKey: "walks_issued", value: 2 },
      { propKey: "strikeouts", value: 9 },
      { propKey: "batters_faced", value: 29 },
      { propKey: "pitches_thrown", value: 103 },
      { propKey: "game_started", value: true },
      { propKey: "loss", value: true },
    ],
    relations: {
      [P("player")]: { toEntity: IDS.person_cole },
      [P("game")]: { toEntity: IDS.game_test },
      [P("team")]: { toEntity: IDS.team_nyy },
      [P("season")]: { toEntity: IDS.season_2025 },
    },
  }));

  allOps.push(...entity({
    id: IDS.field_perf, name: "Judge (RF) — 2025-04-15",
    types: [T("fielding_performance")],
    values: [
      { propKey: "innings_fielded", value: 9.0 },
      { propKey: "putouts", value: 2 },
      { propKey: "assists", value: 0 },
      { propKey: "errors", value: 0 },
    ],
    relations: {
      [P("player")]: { toEntity: IDS.person_judge },
      [P("game")]: { toEntity: IDS.game_test },
      [P("team")]: { toEntity: IDS.team_nyy },
      [P("season")]: { toEntity: IDS.season_2025 },
      [P("fielding_position")]: { toEntity: IDS.pos_right },
    },
  }));

  // ── Roster entry ────────────────────────────────────────────────────────

  console.log("── Roster entry ──");

  allOps.push(...entity({
    id: IDS.roster_ohtani, name: "Ohtani — CIN 2025",
    types: [T("roster_entry")],
    values: [
      { propKey: "year", value: 2025 },
    ],
    relations: {
      [P("player")]: { toEntity: IDS.person_ohtani },
      [P("team")]: { toEntity: IDS.team_cin },
      [P("season")]: { toEntity: IDS.season_2025 },
      [P("position")]: { toEntity: IDS.pos_dh },
    },
  }));

  // ── Publish ─────────────────────────────────────────────────────────────

  console.log(`\nTotal: ${allOps.length} operations`);

  if (DRY_RUN) {
    console.log("\n── Dry run — writing ops to file ──");
    printOps(allOps, ".", "test_entities_ops.json");
  } else {
    console.log("\n── Publishing to Geo ──");
    await publishOps(allOps, "Baseball Test Entities");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

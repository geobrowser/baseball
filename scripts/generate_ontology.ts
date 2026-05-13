// Generate src/ontology.json — the machine-readable version of the ontology
// specified in ontology.txt and docs/ontology-rules.md.
//
// Uses IdUtils.generate() for any type or property that doesn't already exist
// in the Geo graph. Runs once; the generated ontology.json freezes IDs.
//
// Existing-entity reuse strategy (per docs/ontology-rules.md §5):
//   1. Reuse the canonical ID from the root space when the type/property
//      semantically matches.
//   2. Reuse with multi-space publish when the ID matches but the
//      description / schema needs to differ — same ID, our space's values.
//   3. Otherwise create new.
//
// Run:  bun run scripts/generate_ontology.ts

import { IdUtils } from "@geoprotocol/geo-sdk";
import { writeFileSync, existsSync, readFileSync } from "fs";
import path from "path";

// ── Helpers ─────────────────────────────────────────────────────────────────

const ROOT = "a19c345ab9866679b001d7d2138d88a1";

// Where existing JSON lives — preserve generated IDs across reruns
const ONTOLOGY_PATH = path.join(__dirname, "..", "src", "ontology.json");
const previous = existsSync(ONTOLOGY_PATH)
  ? JSON.parse(readFileSync(ONTOLOGY_PATH, "utf8"))
  : { types: {}, properties: {}, type_schemas: {} };

const id = (key: string, kind: "types" | "properties", existingId?: string): string => {
  if (existingId) return existingId;
  const prev = previous[kind]?.[key]?.id;
  if (prev) return prev;
  return IdUtils.generate();
};

// ── Existing IDs from API queries (see scripts/generate_ontology — verified) ─

const EXISTING_TYPES = {
  person:           "7ed45f2bc48b419e8e4664d5ff680b0d",  // root
  team:             "d94df75502ff40c18169ce0e65377ebe",  // root (multi-space, our description)
  city:             "01b05333941a4b00bc78fac5a15b467d",  // root
  state_or_region:  "dbe62a14ec954a7193767db33b661ff5",  // root (was "State" — multi-space rename to "State or region")
  country:          "42a0a7618c82459fad0834bfeb437cde",  // root
  person_role:      "e4e366e9d5554b6892bf7358e824afd2",  // root (was "Role" — multi-space rename)
  place:            "783bc688e65f4e54b67fa5643d78345e",  // root (not used directly but reserved)
};

const EXISTING_PROPS = {
  // System (root) — names are GRC-20 system properties
  name:        "a126ca530c8e48d5b88882c734c38935",
  description: "9b1f76ff9711404c861e59dc3fa7d037",
  cover:       "34f535072e6b42c5a84443981a77cfa2",
  avatar:      "1155befffad549b7a2e0da4777b8792c",
  // Reusable from existing spaces
  birth_date:    "60f8b943d9a742109356fc108ee7212c",  // Date
  country_rel:   "6d8cd471f7af415f941118b1ef106434",  // Relation → Country
  city_rel:      "5648dbdcc09d4d27a8405c50d8355268",  // Relation → City
  state_rel:     "47b55f87c5ca4b2db1ac32296fd0c650",  // Relation → State (used for state_or_region)
  year:          "f4695d976a184cf2b7487f0c087d5399",  // Integer
  start_date:    "eed03a040acd4a9e81e08272ed70a817",  // Date
  end_date:      "b08b8f63dc1e41568b0819946f2b011c",  // Date
  notes:         "6d25739b9217e7c35103b37c3db12709",  // Text
  abbreviation:  "be23a4adc37357670d6031b11e0bcd3c",  // Text
  latitude:      "0dcc46a234914cb49ca10e7443c5da11",  // Float (country centroid; reuse for Point coordinates if needed — we use Point combined)
  longitude:     "6dffb3cd2d7845a1b5e40e58f07e6c6a",  // Float
};

// ── Type definitions ────────────────────────────────────────────────────────

type TypeDef = {
  name: string;
  description: string;
  existingId?: string;
  existing?: boolean;  // true when reusing — write existing: true in JSON
};

const TYPES: Record<string, TypeDef> = {
  // Top-level entity types
  person:                       { name: "Person",                       description: "A person in baseball history — player, manager, coach, umpire, or official scorer.", existingId: EXISTING_TYPES.person, existing: true },
  team:                         { name: "Team",                         description: "A baseball franchise across its history.", existingId: EXISTING_TYPES.team, existing: true },
  ballpark:                     { name: "Ballpark",                     description: "A venue where MLB or affiliated games have been played." },
  city:                         { name: "City",                         description: "A city, town, or municipality.", existingId: EXISTING_TYPES.city, existing: true },
  state_or_region:              { name: "State or region",              description: "A state, province, prefecture, or other sub-national region.", existingId: EXISTING_TYPES.state_or_region, existing: true },
  country:                      { name: "Country",                      description: "A sovereign nation.", existingId: EXISTING_TYPES.country, existing: true },
  league:                       { name: "League",                       description: "A baseball league." },
  game:                         { name: "Game",                         description: "A single baseball game between two teams that was actually played." },
  season:                       { name: "Season",                       description: "A single league-season (one entity per league per year)." },
  roster_entry:                 { name: "Roster entry",                 description: "A player's affiliation with a team for a single season, plus all season-aggregate stats." },
  staff_stint:                  { name: "Staff stint",                  description: "A manager / coach / umpire / official scorer affiliation for a single season." },
  batting_line:                 { name: "Batting line",                 description: "One player's batting performance in one game." },
  pitching_line:                { name: "Pitching line",                description: "One pitcher's performance in one game." },
  fielding_line:                { name: "Fielding line",                description: "One player's defensive appearance at one position in one game." },
  play:                         { name: "Play",                         description: "A single plate appearance / play-by-play event with full game state at the moment of the event." },
  ejection:                     { name: "Ejection",                     description: "An ejection of a player, manager, coach, trainer, or other party by an umpire." },
  scheduled_game:               { name: "Scheduled game",               description: "A scheduled (not necessarily played) game, including future seasons and postponement / makeup metadata." },
  notable_game_collection:      { name: "Notable game collection",      description: "A curated set of notable games (no-hitters, cycles, triple plays, etc.)." },

  // Relation entity types
  team_game_record:             { name: "Team game record",             description: "Relation entity for Game → Team. Per-team data for a single game (side, score, manager, starting pitcher, box totals)." },
  umpire_assignment:            { name: "Umpire assignment",            description: "Relation entity for Game → Person umpire. Carries the umpire's position for that game." },
  roster_position_assignment:   { name: "Roster position assignment",   description: "Relation entity for Roster entry → Position. Carries games played at that position for the season." },
  team_ballpark_tenancy:        { name: "Team ballpark tenancy",        description: "Relation entity for Team → Ballpark. Carries the date range a team played home games at that park." },

  // Reference / lookup types
  position:                     { name: "Position",                     description: "A defensive or batting-order position." },
  handedness:                   { name: "Handedness",                   description: "Batting or throwing hand: Left, Right, Both/Switch, Unknown." },
  person_role:                  { name: "Person role",                  description: "A role a person can hold in baseball: Player, Manager, Coach, Umpire, Official scorer.", existingId: EXISTING_TYPES.person_role, existing: true },
  game_type:                    { name: "Game type",                    description: "The competitive context of a game (regular, postseason, exhibition, etc.)." },
  field_condition:              { name: "Field condition",              description: "Playing surface condition." },
  precipitation:                { name: "Precipitation",                description: "Precipitation conditions during the game." },
  sky_condition:                { name: "Sky condition",                description: "Sky / lighting conditions during the game." },
  wind_direction:               { name: "Wind direction",               description: "Direction the wind is blowing during the game." },
  day_of_week:                  { name: "Day of week",                  description: "Day of the week (Monday … Sunday)." },
  stat_type:                    { name: "Stat type",                    description: "Distinguishes the kind of stat-line record (Value, Official, Lower bound, Upper bound)." },
  game_result:                  { name: "Game result",                  description: "The outcome of a game from a team's perspective: Win, Loss, Tie." },
  side:                         { name: "Side",                         description: "Whether a team is playing at home or visiting in a given game." },
  umpire_position:              { name: "Umpire position",              description: "The position an umpire works during a game." },
  half_inning:                  { name: "Half inning",                  description: "Top or Bottom of an inning." },
  play_event_type:              { name: "Play event type",              description: "An atomic outcome that can occur on a single play." },
  hit_trajectory:               { name: "Hit trajectory",               description: "The trajectory of a batted ball (fly / ground / line / pop / bunt variants)." },
  ejection_role:                { name: "Ejection role",                description: "Role of the ejected party (Player, Manager, Coach, Trainer, Non-uniformed)." },
  notable_collection_category:  { name: "Notable collection category",  description: "Category for a curated game collection (No-hitters, Triple plays, etc.)." },
  pbp_source:                   { name: "PBP source",                   description: "How a play-by-play record was sourced — recorded directly or deduced." },
};

// ── Property definitions ────────────────────────────────────────────────────

type DataType = "TEXT" | "INTEGER" | "FLOAT" | "BOOLEAN" | "DATE" | "DATETIME" | "TIME" | "POINT" | "RELATION";

type PropDef = {
  name: string;
  description: string;
  dataType: DataType;
  toEntityTypes?: string[];   // type keys for RELATION
  multi?: boolean;             // multi-valued relation
  ordered?: boolean;           // ordered multi
  relationEntityType?: string; // type key when relation entity carries data
  existingId?: string;
  existing?: boolean;
};

const PROPS: Record<string, PropDef> = {
  // ── System (always reused from root)
  name:        { name: "Name",        description: "Human-readable name for the entity.", dataType: "TEXT", existingId: EXISTING_PROPS.name,        existing: true },
  description: { name: "Description", description: "Short description used in previews and summaries.", dataType: "TEXT", existingId: EXISTING_PROPS.description, existing: true },
  cover:       { name: "Cover",       description: "Banner-style image for the entity.", dataType: "RELATION", toEntityTypes: [],   existingId: EXISTING_PROPS.cover,       existing: true },
  avatar:      { name: "Avatar",      description: "Avatar / headshot image.",           dataType: "RELATION", toEntityTypes: [],   existingId: EXISTING_PROPS.avatar,      existing: true },

  // ── Person properties
  also_known_as:                { name: "Also known as",        description: "Alternate names (birth name, AKA, nicknames). Multi-valued.", dataType: "TEXT", multi: true },
  birth_date:                   { name: "Birth date",           description: "The date of birth for a person.", dataType: "DATE", existingId: EXISTING_PROPS.birth_date, existing: true },
  birth_place:                  { name: "Birth place",          description: "Most-specific known birth location: City, State or region, or Country.", dataType: "RELATION", toEntityTypes: ["city", "state_or_region", "country"] },
  death_date:                   { name: "Death date",           description: "The date of death (null if alive).", dataType: "DATE" },
  death_place:                  { name: "Death place",          description: "Most-specific known death location: City, State or region, or Country.", dataType: "RELATION", toEntityTypes: ["city", "state_or_region", "country"] },
  bats:                         { name: "Bats",                 description: "Batting hand.", dataType: "RELATION", toEntityTypes: ["handedness"] },
  throws:                       { name: "Throws",               description: "Throwing hand.", dataType: "RELATION", toEntityTypes: ["handedness"] },
  height_inches:                { name: "Height (inches)",      description: "Player height in whole inches.", dataType: "INTEGER" },
  weight_lbs:                   { name: "Weight (lbs)",         description: "Player weight in whole pounds.", dataType: "INTEGER" },
  hall_of_fame:                 { name: "Hall of fame",         description: "True if inducted into the Baseball Hall of Fame.", dataType: "BOOLEAN" },
  retrosheet_person_id:         { name: "Retrosheet person ID", description: "Retrosheet's unique person identifier (e.g., \"ohtas001\").", dataType: "TEXT" },

  // ── Team properties
  city:                         { name: "City",                 description: "City the team is based in.", dataType: "RELATION", toEntityTypes: ["city"], existingId: EXISTING_PROPS.city_rel, existing: true },
  leagues:                      { name: "Leagues",              description: "Leagues this franchise has played in.", dataType: "RELATION", toEntityTypes: ["league"], multi: true },
  first_active_year:            { name: "First active year",    description: "First active season (year-only).", dataType: "INTEGER" },
  last_active_year:             { name: "Last active year",     description: "Last active season (null if currently active).", dataType: "INTEGER" },
  home_ballparks:               { name: "Home ballparks",       description: "All venues used as home, with tenancy windows on the relation entity.", dataType: "RELATION", toEntityTypes: ["ballpark"], multi: true, ordered: true, relationEntityType: "team_ballpark_tenancy" },
  retrosheet_team_id:           { name: "Retrosheet team ID",   description: "Retrosheet's primary 2-3 char team code (e.g., \"NYA\").", dataType: "TEXT" },
  alternate_retrosheet_ids:     { name: "Alternate Retrosheet IDs", description: "Other Retrosheet team codes used in different seasons.", dataType: "TEXT", multi: true },

  // ── Ballpark properties
  state_or_region:              { name: "State or region",      description: "Containing state, province, or region.", dataType: "RELATION", toEntityTypes: ["state_or_region"], existingId: EXISTING_PROPS.state_rel, existing: true },
  country:                      { name: "Country",              description: "Containing country.", dataType: "RELATION", toEntityTypes: ["country"], existingId: EXISTING_PROPS.country_rel, existing: true },
  opening_date:                 { name: "Opening date",         description: "First game date at this venue.", dataType: "DATE" },
  closing_date:                 { name: "Closing date",         description: "Last game date (null if still active).", dataType: "DATE" },
  primary_league:               { name: "Primary league",       description: "Primary league played at this venue.", dataType: "RELATION", toEntityTypes: ["league"] },
  notes:                        { name: "Notes",                description: "Free-text notes about usage, gaps, shared tenants.", dataType: "TEXT", existingId: EXISTING_PROPS.notes, existing: true },
  retrosheet_park_id:           { name: "Retrosheet park ID",   description: "Retrosheet's park code (e.g., \"BOS07\").", dataType: "TEXT" },
  location:                     { name: "Location",             description: "WGS84 geographic coordinates (renderable: Geo location). Optional — populated via geocoding.", dataType: "POINT" },

  // ── City / State / Country properties
  // (City uses state_or_region and country relation from above)
  iso_country_code_alpha_2:     { name: "ISO country code (alpha-2)", description: "Two-letter ISO 3166-1 country code.", dataType: "TEXT" },
  iso_country_code_alpha_3:     { name: "ISO country code (alpha-3)", description: "Three-letter ISO 3166-1 country code.", dataType: "TEXT" },

  // ── League properties (also reuse abbreviation, first_active_year, last_active_year)
  abbreviation:                 { name: "Abbreviation",         description: "Shortened form or acronym (e.g., \"AL\", \"NL\", \"NAL\").", dataType: "TEXT", existingId: EXISTING_PROPS.abbreviation, existing: true },

  // ── Game properties
  date:                         { name: "Date",                 description: "Game date.", dataType: "DATE" },
  game_number:                  { name: "Game number",          description: "0 for single game; 1 or 2 for doubleheader.", dataType: "INTEGER" },
  day_of_week:                  { name: "Day of week",          description: "Day of the week.", dataType: "RELATION", toEntityTypes: ["day_of_week"] },
  teams:                        { name: "Teams",                description: "Teams playing in this game (Home + Away). Per-team data lives on the relation entity.", dataType: "RELATION", toEntityTypes: ["team"], multi: true, relationEntityType: "team_game_record" },
  venue:                        { name: "Venue",                description: "Ballpark where this game was played.", dataType: "RELATION", toEntityTypes: ["ballpark"] },
  attendance:                   { name: "Attendance",           description: "Number of people in attendance.", dataType: "INTEGER" },
  duration_minutes:             { name: "Duration (minutes)",   description: "Game duration in minutes.", dataType: "INTEGER" },
  day_game:                     { name: "Day game",             description: "True = day game, false = night game.", dataType: "BOOLEAN" },
  game_length_outs:             { name: "Game length (outs)",   description: "Total outs recorded (54 = regulation 9-inning game).", dataType: "INTEGER" },
  innings_played:               { name: "Innings played",       description: "Number of innings played.", dataType: "INTEGER" },
  used_dh:                      { name: "Used DH",              description: "True if the designated hitter rule was used.", dataType: "BOOLEAN" },
  game_type:                    { name: "Game type",            description: "Competitive context (regular, postseason, exhibition).", dataType: "RELATION", toEntityTypes: ["game_type"] },
  season:                       { name: "Season",               description: "The league-season this game belongs to.", dataType: "RELATION", toEntityTypes: ["season"] },
  start_time:                   { name: "Start time",           description: "Game start time (e.g., \"8:08PM\").", dataType: "TIME" },
  field_condition:              { name: "Field condition",      description: "Playing surface condition.", dataType: "RELATION", toEntityTypes: ["field_condition"] },
  precipitation:                { name: "Precipitation",        description: "Precipitation conditions.", dataType: "RELATION", toEntityTypes: ["precipitation"] },
  sky_condition:                { name: "Sky condition",        description: "Sky / lighting conditions.", dataType: "RELATION", toEntityTypes: ["sky_condition"] },
  temperature_f:                { name: "Temperature (F)",      description: "Temperature in Fahrenheit at game time.", dataType: "INTEGER" },
  wind_direction:               { name: "Wind direction",       description: "Direction of wind at game time.", dataType: "RELATION", toEntityTypes: ["wind_direction"] },
  wind_speed_mph:               { name: "Wind speed (mph)",     description: "Wind speed in mph at game time.", dataType: "INTEGER" },
  umpires:                      { name: "Umpires",              description: "Umpires for the game, ordered home plate first then 1B/2B/3B/LF/RF.", dataType: "RELATION", toEntityTypes: ["person"], multi: true, ordered: true, relationEntityType: "umpire_assignment" },
  official_scorer:              { name: "Official scorer",      description: "Official scorer for the game.", dataType: "RELATION", toEntityTypes: ["person"] },
  winning_pitcher:              { name: "Winning pitcher",      description: "Pitcher credited with the win.", dataType: "RELATION", toEntityTypes: ["person"] },
  losing_pitcher:               { name: "Losing pitcher",       description: "Pitcher charged with the loss.", dataType: "RELATION", toEntityTypes: ["person"] },
  save_pitcher:                 { name: "Save pitcher",         description: "Pitcher credited with the save (null if no save).", dataType: "RELATION", toEntityTypes: ["person"] },
  completion_info:              { name: "Completion info",      description: "Info if game was completed on a different date.", dataType: "TEXT" },
  forfeit_info:                 { name: "Forfeit info",         description: "Forfeit details if applicable.", dataType: "TEXT" },
  retrosheet_id:                { name: "Retrosheet ID",        description: "Retrosheet game identifier (e.g., \"NYA202410300\").", dataType: "TEXT" },

  // ── Team game record (relation entity on Game.Teams)
  side:                         { name: "Side",                 description: "Home or Away.", dataType: "RELATION", toEntityTypes: ["side"] },
  score:                        { name: "Score",                description: "Final runs scored by this team.", dataType: "INTEGER" },
  result:                       { name: "Result",               description: "Win, Loss, or Tie.", dataType: "RELATION", toEntityTypes: ["game_result"] },
  manager:                      { name: "Manager",              description: "Team manager for this game.", dataType: "RELATION", toEntityTypes: ["person"] },
  starting_pitcher:             { name: "Starting pitcher",     description: "Team's starting pitcher.", dataType: "RELATION", toEntityTypes: ["person"] },
  // Box totals — reused on Team game record + Batting line as appropriate
  at_bats:                      { name: "At bats",              description: "At bats.", dataType: "INTEGER" },
  hits:                         { name: "Hits",                 description: "Hits.", dataType: "INTEGER" },
  doubles:                      { name: "Doubles",              description: "Doubles.", dataType: "INTEGER" },
  triples:                      { name: "Triples",              description: "Triples.", dataType: "INTEGER" },
  home_runs:                    { name: "Home runs",            description: "Home runs.", dataType: "INTEGER" },
  runs_batted_in:               { name: "Runs batted in",       description: "Runs batted in (RBI).", dataType: "INTEGER" },
  walks:                        { name: "Walks",                description: "Walks (bases on balls).", dataType: "INTEGER" },
  strikeouts:                   { name: "Strikeouts",           description: "Strikeouts.", dataType: "INTEGER" },
  stolen_bases:                 { name: "Stolen bases",         description: "Stolen bases.", dataType: "INTEGER" },
  left_on_base:                 { name: "Left on base",         description: "Runners left on base.", dataType: "INTEGER" },

  // ── Umpire assignment (relation entity)
  umpire_position:              { name: "Umpire position",      description: "Position the umpire worked (HP, 1B, 2B, 3B, LF, RF).", dataType: "RELATION", toEntityTypes: ["umpire_position"] },

  // ── Roster position assignment (relation entity)
  // Note: "Games played" is reused on Roster entry (season total) AND on this
  // relation entity (per-position total). Same property entity — semantics
  // disambiguated by which type the link is on.
  games_played:                 { name: "Games played",         description: "Games played (total on Roster entry; per-position on Roster position assignment).", dataType: "INTEGER" },

  // ── Team ballpark tenancy (relation entity)
  first_game_date:              { name: "First game date",      description: "First home game date at this venue.", dataType: "DATE" },
  last_game_date:               { name: "Last game date",       description: "Last home game date at this venue.", dataType: "DATE" },

  // ── Season properties
  year:                         { name: "Year",                 description: "Calendar year of the season.", dataType: "INTEGER", existingId: EXISTING_PROPS.year, existing: true },
  league:                       { name: "League",               description: "League this season belongs to.", dataType: "RELATION", toEntityTypes: ["league"] },
  start_date:                   { name: "Start date",           description: "First day of the season.", dataType: "DATE", existingId: EXISTING_PROPS.start_date, existing: true },
  end_date:                     { name: "End date",             description: "Last day of the season.", dataType: "DATE", existingId: EXISTING_PROPS.end_date, existing: true },

  // ── Roster entry properties
  person:                       { name: "Person",               description: "The person this affiliation is for.", dataType: "RELATION", toEntityTypes: ["person"] },
  team:                         { name: "Team",                 description: "Team this affiliation is with.", dataType: "RELATION", toEntityTypes: ["team"] },
  positions_played:             { name: "Positions played",     description: "Positions played, ordered: primary first then by descending games.", dataType: "RELATION", toEntityTypes: ["position"], multi: true, ordered: true, relationEntityType: "roster_position_assignment" },
  first_game_of_season_date:    { name: "First game of season (date)", description: "Person's first game with this team this season.", dataType: "DATE" },
  last_game_of_season_date:     { name: "Last game of season (date)",  description: "Person's last game with this team this season.", dataType: "DATE" },
  season_batting_average:       { name: "Season batting average",       description: "Season AVG = H / AB.", dataType: "FLOAT" },
  season_on_base_percentage:    { name: "Season on-base percentage",    description: "Season OBP = (H+BB+HBP) / (AB+BB+HBP+SF).", dataType: "FLOAT" },
  season_slugging:              { name: "Season slugging",              description: "Season SLG = TB / AB; TB = 1B + 2*2B + 3*3B + 4*HR.", dataType: "FLOAT" },
  season_ops:                   { name: "Season OPS",                   description: "Season OPS = OBP + SLG.", dataType: "FLOAT" },
  season_era:                   { name: "Season ERA",                   description: "Season ERA = ER * 9 / IP.", dataType: "FLOAT" },
  season_whip:                  { name: "Season WHIP",                  description: "Season WHIP = (BB + H allowed) / IP.", dataType: "FLOAT" },
  season_fielding_percentage:   { name: "Season fielding percentage",   description: "Season FP = (PO + A) / (PO + A + E).", dataType: "FLOAT" },

  // ── Staff stint properties (Person, Team, Season reused)
  role:                         { name: "Role",                 description: "Role: Manager / Coach / Umpire / Official scorer.", dataType: "RELATION", toEntityTypes: ["person_role"] },
  games:                        { name: "Games",                description: "Total games for this stint (season).", dataType: "INTEGER" },

  // ── Stat line shared
  opponent_team:                { name: "Opponent team",        description: "Opposing team in this game (one-hop convenience).", dataType: "RELATION", toEntityTypes: ["team"] },
  stat_type:                    { name: "Stat type",            description: "Value / Official / Lower bound / Upper bound.", dataType: "RELATION", toEntityTypes: ["stat_type"] },

  // ── Batting line properties
  game:                         { name: "Game",                 description: "The game this record belongs to.", dataType: "RELATION", toEntityTypes: ["game"] },
  batter:                       { name: "Batter",               description: "Batter for this batting line.", dataType: "RELATION", toEntityTypes: ["person"] },
  lineup_position:              { name: "Lineup position",      description: "Lineup position (1–9).", dataType: "INTEGER" },
  lineup_sequence:              { name: "Lineup sequence",      description: "1 = starter; 2+ = pinch hitters / substitutes.", dataType: "INTEGER" },
  plate_appearances:            { name: "Plate appearances",    description: "Plate appearances.", dataType: "INTEGER" },
  runs:                         { name: "Runs",                 description: "Runs scored.", dataType: "INTEGER" },
  sacrifice_hits:               { name: "Sacrifice hits",       description: "Sacrifice hits (bunts).", dataType: "INTEGER" },
  sacrifice_flies:              { name: "Sacrifice flies",      description: "Sacrifice flies.", dataType: "INTEGER" },
  hit_by_pitch:                 { name: "Hit by pitch",         description: "Hit-by-pitch count.", dataType: "INTEGER" },
  intentional_walks:            { name: "Intentional walks",    description: "Intentional walks.", dataType: "INTEGER" },
  caught_stealing:              { name: "Caught stealing",      description: "Caught-stealing count.", dataType: "INTEGER" },
  grounded_into_double_play:    { name: "Grounded into double play", description: "Grounded into double play (GIDP).", dataType: "INTEGER" },
  reached_on_interference:      { name: "Reached on interference",   description: "Reached on interference.", dataType: "INTEGER" },
  reached_on_error:             { name: "Reached on error",          description: "Reached on error.", dataType: "INTEGER" },
  is_designated_hitter:         { name: "Is designated hitter",      description: "Batted as DH this game.", dataType: "BOOLEAN" },

  // ── Pitching line properties
  pitcher:                      { name: "Pitcher",              description: "Pitcher for this pitching line.", dataType: "RELATION", toEntityTypes: ["person"] },
  pitching_sequence:            { name: "Pitching sequence",    description: "1 = starter; 2+ = relievers in order.", dataType: "INTEGER" },
  innings_pitched_outs:         { name: "Innings pitched (outs)", description: "Innings pitched expressed as outs (raw — 27 = 9 IP).", dataType: "INTEGER" },
  innings_pitched:              { name: "Innings pitched",        description: "Innings pitched in base-3 baseball notation (6.2 = 6⅔ IP, NOT 6.2).", dataType: "FLOAT" },
  batters_faced:                { name: "Batters faced",          description: "Batters faced.", dataType: "INTEGER" },
  hits_allowed:                 { name: "Hits allowed",           description: "Hits allowed.", dataType: "INTEGER" },
  doubles_allowed:              { name: "Doubles allowed",        description: "Doubles allowed.", dataType: "INTEGER" },
  triples_allowed:              { name: "Triples allowed",        description: "Triples allowed.", dataType: "INTEGER" },
  home_runs_allowed:            { name: "Home runs allowed",      description: "Home runs allowed.", dataType: "INTEGER" },
  runs_allowed:                 { name: "Runs allowed",           description: "Runs allowed.", dataType: "INTEGER" },
  earned_runs:                  { name: "Earned runs",            description: "Earned runs.", dataType: "INTEGER" },
  walks_issued:                 { name: "Walks issued",           description: "Walks issued.", dataType: "INTEGER" },
  intentional_walks_issued:     { name: "Intentional walks issued", description: "Intentional walks issued.", dataType: "INTEGER" },
  hit_batters:                  { name: "Hit batters",            description: "Batters hit by pitch.", dataType: "INTEGER" },
  wild_pitches:                 { name: "Wild pitches",           description: "Wild pitches.", dataType: "INTEGER" },
  balks:                        { name: "Balks",                  description: "Balks.", dataType: "INTEGER" },
  stolen_bases_allowed:         { name: "Stolen bases allowed",   description: "Stolen bases allowed.", dataType: "INTEGER" },
  sacrifice_hits_allowed:       { name: "Sacrifice hits allowed", description: "Sacrifice hits allowed.", dataType: "INTEGER" },
  sacrifice_flies_allowed:      { name: "Sacrifice flies allowed",description: "Sacrifice flies allowed.", dataType: "INTEGER" },
  passed_balls:                 { name: "Passed balls",           description: "Passed balls.", dataType: "INTEGER" },
  game_finished:                { name: "Game finished",          description: "Pitcher finished the game.", dataType: "BOOLEAN" },
  game_started:                 { name: "Game started",           description: "Pitcher started the game.", dataType: "BOOLEAN" },
  complete_game:                { name: "Complete game",          description: "Pitched a complete game.", dataType: "BOOLEAN" },
  loss:                         { name: "Loss",                   description: "True if this pitcher took the loss.", dataType: "BOOLEAN" },
  no_outs_recorded:             { name: "No outs recorded",       description: "True if pitcher recorded zero outs.", dataType: "BOOLEAN" },

  // ── Fielding line properties
  fielder:                      { name: "Fielder",                description: "Fielder for this fielding line.", dataType: "RELATION", toEntityTypes: ["person"] },
  position:                     { name: "Position",               description: "Defensive position.", dataType: "RELATION", toEntityTypes: ["position"] },
  defensive_sequence:           { name: "Defensive sequence",     description: "1 = started at this position; 2+ = entered later.", dataType: "INTEGER" },
  innings_fielded_outs:         { name: "Innings fielded (outs)", description: "Innings fielded expressed as outs.", dataType: "INTEGER" },
  putouts:                      { name: "Putouts",                description: "Putouts.", dataType: "INTEGER" },
  assists:                      { name: "Assists",                description: "Assists.", dataType: "INTEGER" },
  errors:                       { name: "Errors",                 description: "Errors.", dataType: "INTEGER" },
  double_plays:                 { name: "Double plays",           description: "Double plays participated in.", dataType: "INTEGER" },
  triple_plays:                 { name: "Triple plays",           description: "Triple plays participated in.", dataType: "INTEGER" },
  started_at_position:          { name: "Started at position",    description: "Started the game at this defensive position.", dataType: "BOOLEAN" },

  // ── Play properties
  inning:                       { name: "Inning",                 description: "Inning number.", dataType: "INTEGER" },
  half_inning:                  { name: "Half inning",            description: "Top or Bottom of the inning.", dataType: "RELATION", toEntityTypes: ["half_inning"] },
  plate_appearance_number:      { name: "Plate appearance number",description: "Sequential plate appearance number in the game.", dataType: "INTEGER" },
  batting_team:                 { name: "Batting team",           description: "Team currently batting.", dataType: "RELATION", toEntityTypes: ["team"] },
  pitching_team:                { name: "Pitching team",          description: "Team currently pitching/fielding.", dataType: "RELATION", toEntityTypes: ["team"] },
  score_visiting:               { name: "Score (visiting)",       description: "Visiting team score AT this play (mid-game, not final).", dataType: "INTEGER" },
  score_home:                   { name: "Score (home)",           description: "Home team score AT this play (mid-game, not final).", dataType: "INTEGER" },
  batter_handedness:            { name: "Batter handedness",      description: "Batter's handedness at this plate appearance.", dataType: "RELATION", toEntityTypes: ["handedness"] },
  pitcher_handedness:           { name: "Pitcher handedness",     description: "Pitcher's handedness at this plate appearance.", dataType: "RELATION", toEntityTypes: ["handedness"] },
  event_code:                   { name: "Event code",             description: "Raw Retrosheet event code for round-trip fidelity (e.g., \"S7/L\", \"63\", \"8/F\").", dataType: "TEXT" },
  event_types:                  { name: "Event types",            description: "Atomic outcomes for this play (multi).", dataType: "RELATION", toEntityTypes: ["play_event_type"], multi: true },
  fielders_involved:            { name: "Fielders involved",      description: "Fielder positions that touched the ball, in sequence.", dataType: "RELATION", toEntityTypes: ["position"], multi: true, ordered: true },
  hit_trajectory:               { name: "Hit trajectory",         description: "Trajectory of the batted ball.", dataType: "RELATION", toEntityTypes: ["hit_trajectory"] },
  is_plate_appearance:          { name: "Is plate appearance",    description: "True if this play counts as a plate appearance.", dataType: "BOOLEAN" },
  is_at_bat:                    { name: "Is at bat",              description: "True if this play counts as an at-bat.", dataType: "BOOLEAN" },
  ball_in_play:                 { name: "Ball in play",           description: "True if the ball was put in play.", dataType: "BOOLEAN" },
  balls:                        { name: "Balls",                  description: "Balls in the count.", dataType: "INTEGER" },
  strikes:                      { name: "Strikes",                description: "Strikes in the count.", dataType: "INTEGER" },
  outs_before:                  { name: "Outs before",            description: "Outs before the play.", dataType: "INTEGER" },
  outs_after:                   { name: "Outs after",             description: "Outs after the play.", dataType: "INTEGER" },
  runner_on_first_after:        { name: "Runner on first after",  description: "Runner on 1B after the play.", dataType: "RELATION", toEntityTypes: ["person"] },
  runner_on_second_after:       { name: "Runner on second after", description: "Runner on 2B after the play.", dataType: "RELATION", toEntityTypes: ["person"] },
  runner_on_third_after:        { name: "Runner on third after",  description: "Runner on 3B after the play.", dataType: "RELATION", toEntityTypes: ["person"] },
  pitcher_responsible_for_runner_on_first: { name: "Pitcher responsible for runner on first", description: "Pitcher of record for the runner on 1B after the play.", dataType: "RELATION", toEntityTypes: ["person"] },
  pbp_source:                   { name: "PBP source",             description: "Whether the play-by-play was Recorded or Deduced.", dataType: "RELATION", toEntityTypes: ["pbp_source"] },

  // ── Ejection properties
  ejected_person:               { name: "Ejected person",         description: "Person who was ejected.", dataType: "RELATION", toEntityTypes: ["person"] },
  ejected_role:                 { name: "Ejected role",           description: "Role of the ejected party.", dataType: "RELATION", toEntityTypes: ["ejection_role"] },
  ejecting_umpire:              { name: "Ejecting umpire",        description: "Umpire who issued the ejection.", dataType: "RELATION", toEntityTypes: ["person"] },
  reason:                       { name: "Reason",                 description: "Free-text reason for ejection.", dataType: "TEXT" },

  // ── Scheduled game properties
  home_team:                    { name: "Home team",              description: "Scheduled home team.", dataType: "RELATION", toEntityTypes: ["team"] },
  away_team:                    { name: "Away team",              description: "Scheduled away team.", dataType: "RELATION", toEntityTypes: ["team"] },
  home_team_game_number_in_season: { name: "Home team game number (in season)", description: "Home team's sequential game number for the season.", dataType: "INTEGER" },
  away_team_game_number_in_season: { name: "Away team game number (in season)", description: "Away team's sequential game number for the season.", dataType: "INTEGER" },
  postponement_info:            { name: "Postponement info",      description: "Reason or replacement-venue info if postponed.", dataType: "TEXT" },
  makeup_date:                  { name: "Makeup date",            description: "Date the game was made up (if postponed).", dataType: "DATE" },
  made_up_at_venue:             { name: "Made up at venue",       description: "Venue the makeup was played at (if relocated).", dataType: "RELATION", toEntityTypes: ["ballpark"] },

  // ── Notable game collection
  collection_category:          { name: "Collection category",    description: "Category for this curated collection.", dataType: "RELATION", toEntityTypes: ["notable_collection_category"] },

  // ── Reference-entity-shared properties
  code:                         { name: "Code",                   description: "Short code for a reference instance (e.g., Retrosheet abbreviation).", dataType: "TEXT" },
  position_number:              { name: "Position number",        description: "Numeric position code (1-10).", dataType: "INTEGER" },
  iso_weekday_number:           { name: "ISO weekday number",     description: "ISO weekday number (1=Monday, 7=Sunday).", dataType: "INTEGER" },
};

// ── Type schemas — which properties belong to each type's default schema ────

const TYPE_SCHEMAS: Record<string, string[]> = {
  person: [
    "name", "description", "cover", "avatar",
    "also_known_as",
    "birth_date", "birth_place",
    "death_date", "death_place",
    "bats", "throws",
    "height_inches", "weight_lbs",
    "hall_of_fame",
    "retrosheet_person_id",
  ],
  team: [
    "name", "description", "cover", "avatar",
    "also_known_as",
    "city", "leagues",
    "first_active_year", "last_active_year",
    "home_ballparks",
    "retrosheet_team_id", "alternate_retrosheet_ids",
  ],
  ballpark: [
    "name", "description", "cover", "avatar",
    "also_known_as",
    "city", "state_or_region", "country",
    "opening_date", "closing_date",
    "primary_league",
    "notes",
    "retrosheet_park_id",
    "location",
  ],
  city: [
    "name", "description", "cover", "avatar",
    "state_or_region", "country",
    "location",
  ],
  state_or_region: [
    "name", "description", "cover",
    "abbreviation", "country",
  ],
  country: [
    "name", "description", "cover", "avatar",
    "iso_country_code_alpha_2", "iso_country_code_alpha_3",
  ],
  league: [
    "name", "description", "cover", "avatar",
    "abbreviation",
    "first_active_year", "last_active_year",
  ],
  game: [
    "name", "description", "cover",
    "date", "game_number", "day_of_week",
    "teams",
    "venue", "attendance", "duration_minutes",
    "day_game", "game_length_outs", "innings_played", "used_dh",
    "game_type", "season",
    "start_time",
    "field_condition", "precipitation", "sky_condition",
    "temperature_f", "wind_direction", "wind_speed_mph",
    "umpires", "official_scorer",
    "winning_pitcher", "losing_pitcher", "save_pitcher",
    "completion_info", "forfeit_info",
    "retrosheet_id",
  ],
  season: [
    "name", "description", "cover",
    "year", "league",
    "start_date", "end_date",
  ],
  roster_entry: [
    "name", "description",
    "person", "team", "season",
    "games_played",
    "positions_played",
    "first_game_of_season_date", "last_game_of_season_date",
    "season_batting_average", "season_on_base_percentage",
    "season_slugging", "season_ops",
    "season_era", "season_whip",
    "season_fielding_percentage",
  ],
  staff_stint: [
    "name", "description",
    "person", "role", "team", "season",
    "games",
    "first_game_of_season_date", "last_game_of_season_date",
  ],
  batting_line: [
    "name", "description",
    "game", "batter", "team", "opponent_team",
    "lineup_position", "lineup_sequence", "stat_type",
    "plate_appearances", "at_bats", "runs", "hits",
    "doubles", "triples", "home_runs", "runs_batted_in",
    "sacrifice_hits", "sacrifice_flies", "hit_by_pitch",
    "walks", "intentional_walks", "strikeouts",
    "stolen_bases", "caught_stealing", "grounded_into_double_play",
    "reached_on_interference", "reached_on_error",
    "is_designated_hitter",
  ],
  pitching_line: [
    "name", "description",
    "game", "pitcher", "team", "opponent_team",
    "pitching_sequence", "stat_type",
    "innings_pitched_outs", "innings_pitched",
    "batters_faced", "hits_allowed",
    "doubles_allowed", "triples_allowed", "home_runs_allowed",
    "runs_allowed", "earned_runs",
    "walks_issued", "intentional_walks_issued", "strikeouts",
    "hit_batters", "wild_pitches", "balks",
    "stolen_bases_allowed", "caught_stealing",
    "sacrifice_hits_allowed", "sacrifice_flies_allowed", "passed_balls",
    "game_finished", "game_started", "complete_game", "loss",
    "no_outs_recorded",
  ],
  fielding_line: [
    "name", "description",
    "game", "fielder", "team", "opponent_team",
    "position", "defensive_sequence", "stat_type",
    "innings_fielded_outs",
    "putouts", "assists", "errors",
    "double_plays", "triple_plays", "started_at_position",
  ],
  play: [
    "name", "description",
    "game", "inning", "half_inning", "plate_appearance_number",
    "batting_team", "pitching_team",
    "score_visiting", "score_home",
    "batter", "pitcher", "lineup_position",
    "batter_handedness", "pitcher_handedness",
    "event_code", "event_types", "fielders_involved", "hit_trajectory",
    "is_plate_appearance", "is_at_bat", "ball_in_play",
    "balls", "strikes",
    "outs_before", "outs_after",
    "runner_on_first_after", "runner_on_second_after", "runner_on_third_after",
    "pitcher_responsible_for_runner_on_first",
    "pbp_source",
  ],
  ejection: [
    "name", "description",
    "game", "date", "inning",
    "ejected_person", "ejected_role", "team",
    "ejecting_umpire", "reason",
  ],
  scheduled_game: [
    "name", "description",
    "date", "game_number", "day_of_week",
    "home_team", "away_team", "season",
    "home_team_game_number_in_season", "away_team_game_number_in_season",
    "day_game",
    "postponement_info", "makeup_date", "made_up_at_venue",
  ],
  notable_game_collection: [
    "name", "description", "cover",
    "collection_category",
  ],

  // Relation entity types
  team_game_record: [
    "side", "score", "result",
    "manager", "starting_pitcher",
    "at_bats", "hits", "doubles", "triples", "home_runs",
    "runs_batted_in", "walks", "strikeouts", "stolen_bases", "left_on_base",
  ],
  umpire_assignment: [
    "umpire_position",
  ],
  roster_position_assignment: [
    "games_played",
  ],
  team_ballpark_tenancy: [
    "first_game_date", "last_game_date", "notes",
  ],

  // Reference / lookup types — Name + Description, plus type-specific extras
  position:                    ["name", "description", "abbreviation", "position_number"],
  handedness:                  ["name", "description", "code"],
  person_role:                 ["name", "description"],
  game_type:                   ["name", "description", "code"],
  field_condition:             ["name", "description", "code"],
  precipitation:               ["name", "description", "code"],
  sky_condition:               ["name", "description", "code"],
  wind_direction:              ["name", "description", "code"],
  day_of_week:                 ["name", "description", "abbreviation", "iso_weekday_number"],
  stat_type:                   ["name", "description", "code"],
  game_result:                 ["name", "description", "code"],
  side:                        ["name", "description", "code"],
  umpire_position:             ["name", "description", "code"],
  half_inning:                 ["name", "description", "code"],
  play_event_type:             ["name", "description", "code"],
  hit_trajectory:              ["name", "description", "code"],
  ejection_role:               ["name", "description", "code"],
  notable_collection_category: ["name", "description", "code"],
  pbp_source:                  ["name", "description", "code"],
};

// ── Build & write ────────────────────────────────────────────────────────────

function build() {
  const types: Record<string, any> = {};
  for (const [key, def] of Object.entries(TYPES)) {
    types[key] = {
      id: id(key, "types", def.existingId),
      name: def.name,
      description: def.description,
      ...(def.existing ? { existing: true } : {}),
    };
  }

  const properties: Record<string, any> = {};
  for (const [key, def] of Object.entries(PROPS)) {
    properties[key] = {
      id: id(key, "properties", def.existingId),
      name: def.name,
      description: def.description,
      dataType: def.dataType,
      ...(def.toEntityTypes ? { toEntityTypes: def.toEntityTypes } : {}),
      ...(def.multi ? { multi: true } : {}),
      ...(def.ordered ? { ordered: true } : {}),
      ...(def.relationEntityType ? { relationEntityType: def.relationEntityType } : {}),
      ...(def.existing ? { existing: true } : {}),
    };
  }

  // Validate type_schemas keys reference real properties
  for (const [typeKey, propKeys] of Object.entries(TYPE_SCHEMAS)) {
    if (!types[typeKey]) throw new Error(`type_schemas references unknown type: ${typeKey}`);
    for (const p of propKeys) {
      if (!properties[p]) throw new Error(`type_schemas[${typeKey}] references unknown property: ${p}`);
    }
  }
  // Validate toEntityTypes references real types
  for (const [pk, p] of Object.entries(properties)) {
    for (const t of p.toEntityTypes ?? []) {
      if (!types[t]) throw new Error(`properties.${pk}.toEntityTypes references unknown type: ${t}`);
    }
    if (p.relationEntityType && !types[p.relationEntityType]) {
      throw new Error(`properties.${pk}.relationEntityType references unknown type: ${p.relationEntityType}`);
    }
  }

  return { types, properties, type_schemas: TYPE_SCHEMAS };
}

const out = build();
writeFileSync(ONTOLOGY_PATH, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${ONTOLOGY_PATH}`);
console.log(`  types:      ${Object.keys(out.types).length} (${Object.values(out.types).filter((t: any) => t.existing).length} reused)`);
console.log(`  properties: ${Object.keys(out.properties).length} (${Object.values(out.properties).filter((p: any) => p.existing).length} reused)`);
console.log(`  schemas:    ${Object.keys(out.type_schemas).length}`);

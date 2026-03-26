/**
 * Shared helpers for publish scripts.
 * Provides entity creation, value typing, and dedup lookup utilities.
 */

import { Graph, IdUtils, type Op } from "@geoprotocol/geo-sdk";
import {
  findEntityByName,
  findEntityByTextValue,
  findEntityByIntegerValue,
} from "./functions";
import ontology from "./ontology.json";

// ── Ontology accessors ──────────────────────────────────────────────────────

export const T = (key: string) => (ontology.types as any)[key].id;
export const P = (key: string) => (ontology.properties as any)[key].id;

const propDataType = (key: string): string => {
  const p = (ontology.properties as any)[key];
  return p?.dataType ?? "TEXT";
};

const SDK_TYPE_MAP: Record<string, string> = {
  TEXT: "text", INTEGER: "integer", FLOAT: "float", BOOLEAN: "boolean",
  DATE: "date", DATETIME: "datetime", TIME: "time", POINT: "point",
};

/** Build a typed value param from a property key + raw value. */
export function val(propKey: string, value: any): any {
  const dt = propDataType(propKey);
  const sdkType = SDK_TYPE_MAP[dt];
  if (!sdkType) throw new Error(`Unsupported dataType "${dt}" for property "${propKey}"`);
  return { property: P(propKey), type: sdkType, value };
}

// ── Entity creation ─────────────────────────────────────────────────────────

export interface EntityOpts {
  id?: string;
  name: string;
  description?: string;
  types: string[];
  values?: Array<{ propKey: string; value: any }>;
  relations?: Record<string, { toEntity: string } | Array<{ toEntity: string }>>;
}

/** Create an entity and return its ops. Auto-generates ID if not provided. */
export function createEntityOps(opts: EntityOpts): { id: string; ops: Op[] } {
  const id = opts.id ?? IdUtils.generate();
  const params: any = {
    id,
    name: opts.name,
    description: opts.description,
    types: opts.types,
    values: opts.values?.map(v => val(v.propKey, v.value)),
    relations: opts.relations,
  };
  const { ops } = Graph.createEntity(params);
  return { id, ops };
}

// ── Dedup lookup ────────────────────────────────────────────────────────────

/**
 * Check if an entity already exists before creating it.
 * Lookup order: Retrosheet ID → MLB ID → name + type.
 * Returns existing entity ID if found, null otherwise.
 */
export async function lookupExisting(
  name: string,
  types: string[],
  values?: Array<{ propKey: string; value: any }>,
): Promise<string | null> {
  // Check by Retrosheet ID
  const rsId = values?.find(v => v.propKey === "retrosheet_id");
  if (rsId) {
    const found = await findEntityByTextValue(P("retrosheet_id"), rsId.value as string);
    if (found) return found;
  }

  // Check by MLB ID
  const mlbId = values?.find(v => v.propKey === "mlb_id");
  if (mlbId) {
    const found = await findEntityByIntegerValue(P("mlb_id"), mlbId.value as number);
    if (found) return found;
  }

  // Check by name + type
  if (types.length > 0) {
    const found = await findEntityByName(name, types[0]);
    if (found) return found;
  }

  return null;
}

// ── Reference entity cache ──────────────────────────────────────────────────

/**
 * Cache for reference entity IDs (Handedness, Position, Pitch Type, etc.).
 * Avoids repeated API lookups for the same entity within a script run.
 * Key format: "typeKey:entityName" → entity ID.
 */
const refCache = new Map<string, string>();

/**
 * Get or create a reference entity (small lookup types like Position, Handedness, etc.).
 * Checks cache first, then API, then creates if needed.
 * Returns the entity ID and any ops needed to create it.
 */
export async function getOrCreateRef(
  typeKey: string,
  name: string,
  description?: string,
  skipLookup = false,
): Promise<{ id: string; ops: Op[] }> {
  const cacheKey = `${typeKey}:${name}`;

  // Check cache
  if (refCache.has(cacheKey)) {
    return { id: refCache.get(cacheKey)!, ops: [] };
  }

  // Check API
  if (!skipLookup) {
    const found = await findEntityByName(name, T(typeKey));
    if (found) {
      refCache.set(cacheKey, found);
      return { id: found, ops: [] };
    }
  }

  // Create new
  const { id, ops } = createEntityOps({
    name,
    description,
    types: [T(typeKey)],
  });
  refCache.set(cacheKey, id);
  return { id, ops };
}

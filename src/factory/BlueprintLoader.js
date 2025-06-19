/**
 * Module for loading and caching blueprint JSON files asynchronously.
 */

// Helper to prepend the Vite base URL to paths
function withBase(path) {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}

// Cache for loaded blueprints
const blueprintCache = new Map();

/**
 * Loads all blueprints from the specified paths asynchronously.
 * @param {string[]} paths - Array of paths to blueprint JSON files.
 * @returns {Promise<void>} A promise that resolves when all blueprints are loaded.
 * @throws {Error} If any fetch operation fails with a non-200 status.
 */
export async function loadAll(paths) {
  if (!paths || !Array.isArray(paths)) {
    throw new Error('Paths must be provided as an array');
  }

  const fetchPromises = paths.map(async (path) => {
    try {
      console.log('[BlueprintLoader] fetching', withBase(path));
      const response = await fetch(withBase(path));
      if (!response.ok) {
        throw new Error(`BlueprintLoader Error: failed to fetch ${path} - Status: ${response.status}`);
      }
      const blueprint = await response.json();
      if (blueprint.id) {
        blueprintCache.set(blueprint.id, blueprint);
      } else {
        console.warn(`Blueprint at ${path} has no ID and will not be cached`);
      }
    } catch (error) {
      throw new Error(`BlueprintLoader Error: failed to fetch ${path} - ${error.message}`);
    }
  });

  await Promise.all(fetchPromises);
  console.log(`[BlueprintLoader] loaded ${blueprintCache.size} blueprints`);
}

/**
 * Retrieves a cached blueprint by its ID.
 * @param {string} id - The ID of the blueprint to retrieve.
 * @returns {Object|null} The cached blueprint object, or null if not found.
 */
export function get(id) {
  if (!id) {
    throw new Error('Blueprint ID must be provided');
  }
  return blueprintCache.get(id) || null;
}

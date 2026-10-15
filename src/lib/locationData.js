// ─────────────────────────────────────────────────────────────
// locationData.js
// World states + cities backed by `country-state-city`, loaded LAZILY
// via dynamic import so the multi-MB dataset lands in its own async
// chunk — the initial dashboard bundle never pays for it. The chunk is
// fetched at most once per session (cached promise) the first time a
// State/City dropdown mounts.
// ─────────────────────────────────────────────────────────────

let libPromise = null;

function loadLib() {
  if (!libPromise) {
    libPromise = import("country-state-city").catch(() => null);
  }
  return libPromise;
}

// [{ code, name }] — ISO 3166-2 code + display name. Some records lack an
// isoCode; fall back to the name as the stable key in that case.
// Returns null when the dataset chunk itself fails to load (offline/CDN
// issue) so callers can render a free-text fallback instead of an
// eternally-loading dropdown. Empty array = loaded, country has no states.
export async function getStatesOfCountry(countryCode) {
  const cc = String(countryCode || "").trim().toUpperCase();
  if (!cc) return [];
  const lib = await loadLib();
  if (!lib) return null;
  try {
    return (lib.State.getStatesOfCountry(cc) || []).map((s) => ({
      code: s.isoCode || s.name,
      name: s.name,
    }));
  } catch {
    return [];
  }
}

// [name, ...] deduplicated. When a state is picked, cities come from the
// state; otherwise from the whole country (covers countries with no
// states). `stateCode` must be the ISO code — callers should pass the
// `code` returned by getStatesOfCountry.
export async function getCitiesOf(countryCode, stateCode = "") {
  const cc = String(countryCode || "").trim().toUpperCase();
  if (!cc) return [];
  const lib = await loadLib();
  if (!lib) return null;
  try {
    const raw = stateCode
      ? lib.City.getCitiesOfState(cc, stateCode) || []
      : lib.City.getCitiesOfCountry(cc) || [];
    const seen = new Set();
    const out = [];
    for (const c of raw) {
      const name = c?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
    return out;
  } catch {
    return [];
  }
}

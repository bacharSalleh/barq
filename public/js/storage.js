// Server-backed storage (SQLite) — drop-in replacement for localStorage
// Caches in memory, syncs to server. Extensions use store.get/set/remove.

const cache = new Map();
let migrated = false;

async function init() {
  // Load all keys from server into cache
  try {
    const res = await fetch("/api/store?prefix=ttb-%");
    const data = await res.json();
    for (const [k, v] of Object.entries(data)) cache.set(k, v);
  } catch {}

  // Migrate localStorage → server (one-time)
  if (!cache.has("ttb-migrated") && localStorage.length > 0) {
    const toMigrate = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("ttb-")) {
        toMigrate[key] = localStorage.getItem(key);
        cache.set(key, toMigrate[key]);
      }
    }
    if (Object.keys(toMigrate).length > 0) {
      try {
        await fetch("/api/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toMigrate),
        });
        // Mark migration done
        await fetch("/api/store/ttb-migrated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: "1" }),
        });
        cache.set("ttb-migrated", "1");
        // Clear localStorage
        for (const key of Object.keys(toMigrate)) localStorage.removeItem(key);
        console.log(`[barq] Migrated ${Object.keys(toMigrate).length} keys from localStorage to server`);
      } catch (e) {
        console.warn("[barq] Migration failed, using localStorage fallback", e);
      }
    }
  }
  migrated = true;
}

function getItem(key) {
  return cache.get(key) ?? null;
}

function setItem(key, value) {
  cache.set(key, value);
  // Async write to server — fire and forget
  fetch(`/api/store/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  }).catch(() => {});
}

function removeItem(key) {
  cache.delete(key);
  fetch(`/api/store/${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => {});
}

// Synchronous API matching localStorage interface
export const store = { getItem, setItem, removeItem, init };
export default store;

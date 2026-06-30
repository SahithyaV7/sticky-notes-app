# Code Review — `SimpleCache` Implementation

## Context

The cache is expected to handle **thousands of reads/second**, **hundreds of writes/second**, and **tens of concurrent threads**. The implementation uses `ConcurrentHashMap` as its backing store, which is a good starting point — but several issues remain that would cause serious problems under this load.

---

## Issues

### 1. Unbounded memory growth — no eviction (Critical)

```kotlin
fun put(key: K, value: V) {
    cache[key] = CacheEntry(value, System.currentTimeMillis())
}
```

Expired entries are **never removed from the map**. The only thing that happens when a TTL expires is that `get()` returns `null` — the entry stays in memory. At hundreds of writes per second with a 1-minute TTL, the map will accumulate tens of thousands of dead entries within minutes.

**Impact:** Unchecked heap growth leads to increased GC pressure, longer GC pauses, and eventually `OutOfMemoryError` on a long-running service. `size()` also becomes meaningless because it counts dead entries.

**Fix:** Remove expired entries on detection in `get()`, and add a background eviction sweep (e.g. `ScheduledExecutorService` running every 30s to purge entries older than TTL).

---

### 2. Expired entries not cleaned up on read (Critical)

```kotlin
fun get(key: K): V? {
    val entry = cache[key]
    if (entry != null) {
        if (System.currentTimeMillis() - entry.timestamp < ttlMs) {
            return entry.value
        }
    }
    return null  // ← expired entry detected but left in the map
}
```

When `get()` finds an expired entry it silently returns `null` without removing the dead entry. Every subsequent `get()` for that key re-reads the dead entry, re-checks the timestamp, and returns `null` again — wasted work on every call.

**Fix:** Use `cache.remove(key, entry)` (the conditional two-argument form) when expiry is detected. This is safe under concurrent access — it only removes the entry if it still matches the one you read, avoiding a race where another thread already put a fresh value.

```kotlin
fun get(key: K): V? {
    val entry = cache[key] ?: return null
    if (System.currentTimeMillis() - entry.timestamp < ttlMs) return entry.value
    cache.remove(key, entry) // lazy eviction — safe under concurrency
    return null
}
```

---

### 3. Cache stampede on popular key expiry (Critical)

There is no mechanism to prevent a **thundering herd**. When a frequently-read key expires, all threads that are simultaneously calling `get()` will see a miss at the same moment. If each of those threads then goes to the underlying data source (database, external API) to reload the value, the backend receives a sudden spike of identical requests — exactly the opposite of what a cache is supposed to prevent.

Under thousands of reads per second on a single hot key, this can take down the backend.

**Fix:** Use `ConcurrentHashMap.computeIfAbsent` or a per-key `ReentrantLock`/`Semaphore` so only one thread reloads the value while the others wait and then read from cache:

```kotlin
fun getOrLoad(key: K, loader: () -> V): V {
    val existing = get(key)
    if (existing != null) return existing
    // Only one thread computes; others wait then hit the cache
    return cache.computeIfAbsent(key) {
        CacheEntry(loader(), System.currentTimeMillis())
    }.value
}
```

---

### 4. No `remove` / `invalidate` method (Important)

```kotlin
// The only public API is put(), get(), size()
```

There is no way to explicitly remove or invalidate a single entry. In any real system, cache entries become stale for reasons beyond TTL — a record is deleted, an update is pushed, a deployment changes the data shape. Without `remove(key)`, callers are forced to wait for TTL expiry to clear bad data.

**Fix:** Add an explicit invalidation method:

```kotlin
fun remove(key: K) {
    cache.remove(key)
}

fun clear() {
    cache.clear()
}
```

---

### 5. `size()` counts expired entries (Important)

```kotlin
fun size(): Int {
    return cache.size
}
```

`cache.size` includes every entry ever written that hasn't been overwritten — including entries that expired minutes ago. Any monitoring, alerting, or capacity planning that uses `size()` will see an inflated number and draw wrong conclusions about memory usage and hit rates.

**Impact:** False alarms on cache size metrics; inability to reason about actual cache utilisation.

**Fix:** Either document this limitation clearly, or compute a live size by filtering expired entries (expensive, should not be called on hot paths).

---

### 6. Hardcoded TTL — no per-entry configuration (Minor)

```kotlin
private val ttlMs = 60000 // 1 minute
```

All entries share a single TTL baked in at compile time. Different data types typically have very different freshness requirements — a user session might need 30 minutes, a product price might need 5 seconds. A hardcoded value forces callers to use different cache instances.

**Fix:** Accept TTL as a constructor parameter, and optionally allow per-entry TTL overrides in `put()`.

---

### 7. `System.currentTimeMillis()` for duration measurement (Minor)

```kotlin
val timestamp: Long = System.currentTimeMillis()
// ...
if (System.currentTimeMillis() - entry.timestamp < ttlMs)
```

`System.currentTimeMillis()` reflects wall-clock time, which can jump backwards or forwards when the system clock is adjusted (NTP sync, DST, admin correction). A backwards jump makes a fresh entry look older than it is; a forwards jump makes a stale entry look fresh.

**Fix:** Use `System.nanoTime()` for measuring elapsed duration — it is monotonically increasing and unaffected by clock adjustments. Store it in `CacheEntry` instead of a wall-clock timestamp.

---

## Summary

| # | Issue | Severity | Effect |
|---|---|---|---|
| 1 | No eviction — memory grows forever | **Critical** | OOM on long-running service |
| 2 | Expired entries not removed on read | **Critical** | Memory waste, repeated dead reads |
| 3 | No stampede protection on expiry | **Critical** | Backend spike can cascade to outage |
| 4 | No `remove`/`invalidate` method | **Important** | Cannot clear stale data on demand |
| 5 | `size()` includes dead entries | **Important** | Misleading metrics and monitoring |
| 6 | Hardcoded TTL | Minor | Inflexible for different data types |
| 7 | Wall-clock time for duration | Minor | Clock skew can corrupt expiry logic |

Issues 1–3 must be resolved before this cache is deployed under the described load. A cache that grows without bound and amplifies load spikes on expiry is more dangerous than no cache at all.

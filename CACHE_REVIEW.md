# Code Review — `SimpleCache` Implementation

This implementation is a reasonable first pass, but it has some gaps that would cause issues under the anticipated load (thousands of reads/second, hundreds of writes/second, tens of concurrent threads). Here's what needs to be fixed before this ships.

---

## 1. Memory leak — most urgent

`get()` checks whether an entry is expired but never actually removes it. The stale entry just sits in the map forever. With hundreds of writes per second and no cleanup, this is a slow-motion OOM. The fix on the read path is one line:

```kotlin
cache.remove(key, entry) // atomic: only removes if it's still this exact entry
```

But that only cleans up entries that happen to get read again. Keys that are written once and never accessed will accumulate silently. A background `ScheduledExecutorService` sweeping for expired entries is also needed.

---

## 2. No size limit

Related to the above but a separate problem: even if TTL eviction worked perfectly, there's no cap on how many entries can exist at once. A burst of unique keys — say, a spike in user traffic with high-cardinality IDs — will just keep growing until the heap runs out. Production caches need a hard ceiling and a policy for what gets dropped when you hit it (LRU being the most common choice).

---

## 3. Cache stampede on expiry

When a cached entry expires, multiple threads will simultaneously call `get()`, all see a miss, and all go fetch the underlying data at the same time. With thousands of reads per second, a popular key expiring is a small thundering herd. The standard fix is to store a `CompletableFuture<V>` as the map value instead of the value directly — the first thread creates and inserts the future, subsequent threads find it already there and just wait on it:

```kotlin
private val cache = ConcurrentHashMap<K, CompletableFuture<CacheEntry<V>>>()
```

This ensures only one thread does the actual work per key, regardless of how many threads are asking simultaneously. Note: avoid doing the load inside `compute()` — it holds a segment lock for the duration, which would serialize unrelated keys and create a bottleneck.

---

## 4. `size()` returns a misleading number

`cache.size` counts everything in the map, including entries that expired hours ago. If anything uses `size()` for capacity decisions, eviction triggers, or metrics dashboards, it's going to report a number that's higher than reality. This is easy to miss because the method looks correct — it's just operating on the wrong denominator.

---

## 5. Hardcoded TTL

TTL baked into the class means you need a code change and redeployment to adjust caching behaviour. Different data types almost certainly need different TTLs. Make it a constructor parameter.

---

## Summary

| # | Issue | Severity |
|---|---|---|
| 1 | Expired entries never removed — memory grows forever | **Critical** |
| 2 | No maximum size — heap exhaustion under traffic spikes | **Critical** |
| 3 | No stampede protection — backend spike on popular key expiry | **Critical** |
| 4 | `size()` counts dead entries — misleading metrics | **Important** |
| 5 | Hardcoded TTL — requires redeployment to change | Minor |

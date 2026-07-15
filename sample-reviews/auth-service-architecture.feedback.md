---
keystone-feedback:
  target: auth-service-architecture.md
  status: pending
  verdict: changes-requested
  reviewed-at: 2026-07-15T12:20:46.307Z
---

## Summary

Solid direction overall. Two blockers before this is ready: the token-refresh
policy, and a missing index on the sessions table.

## Comments

<!-- keystone:comment id=k3f9a2 status=pending occ=1 -->
> **On** _(§ Token refresh)_ — «every authenticated request extends the session by 30 minutes»

Sliding expiry with no absolute cap means an active session can live forever.
Add an absolute cap (e.g. 12h) alongside the sliding window, so a stolen token
can't be refreshed indefinitely.
<!-- /keystone:comment -->

<!-- keystone:comment id=b7d1c4 status=pending occ=1 -->
> **On** _(§ Data model)_ — «one row per active session»

We'll query `sessions` by `user_id` on every request — that column needs an
index, otherwise this becomes a full scan under load.
<!-- /keystone:comment -->

---
keystone:
  title: "Postgres 14 → 16 migration plan"
  kind: plan
  status: awaiting-review
---

# Postgres 14 → 16 migration plan

Step-by-step upgrade with a rollback checkpoint at each stage.

1. Snapshot + logical replication slot
2. Spin up a 16 replica, let it catch up
3. Verify extensions (`pg_stat_statements`, `postgis`)
4. Cut over during the Sunday maintenance window

## Rollback

If replication lag exceeds 5 minutes at cutover, abort and fall back to 14.

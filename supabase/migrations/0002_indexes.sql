-- Weather App — supporting indexes (Spec §3 / §6 FR-6).
-- Apply after 0001_init.sql.
--
-- favorites are listed per-user ordered by sort_order; this composite index
-- backs that access pattern (GET /api/favorites ordered list + reorder).

create index if not exists favorites_user_sort_idx
  on public.favorites (user_id, sort_order);

Audit the 28 migration files in `supabase/migrations/` against the live Lovable Cloud project (`vfttlgqsexcdpxihtwzl`), then apply any missing migrations so the full schema is in place.

1. Schema audit (read-only)
- Compare each migration file against the live database catalog (`information_schema`, `pg_tables`, `pg_policies`, `pg_enum`, `pg_proc`).
- Check all tables, enums, columns, indexes, RLS policies, grants, functions, and views created across the migration chain.
- Note the key tables already confirmed present: `profiles`, `certificates`, `managed_wallets`, `user_credits`, `grader_verifications`, `certificate_metadata_versions`, `credit_transactions`, etc.
- Identify any gaps (e.g., missing column, policy, index, or view recreation).

2. If gaps are found
- Create a single targeted migration SQL that replays the missing pieces in dependency order.
- Run it through the Lovable migration tool (`supabase--migration`).
- Ensure every new `CREATE TABLE` in `public` follows the required order: `CREATE TABLE`, `GRANT`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`.
- Re-generate Supabase types after the migration so the frontend types match.

3. If no gaps are found
- Report the confirmation that all 28 migrations are already applied and the schema is in sync.

4. Verification
- Re-query the database to confirm the audited objects exist.
- Run a quick build check (`bunx tsgo --noEmit`) to confirm types still resolve against the live schema.

Out of scope
- No data seeding or destructive resets.
- No changes to edge functions or frontend code unless the migration requires a type/code update.

Note: This plan assumes the target is the currently connected Lovable Cloud project. If you meant a different/newly connected Supabase project, let me know and I’ll adjust the target first.
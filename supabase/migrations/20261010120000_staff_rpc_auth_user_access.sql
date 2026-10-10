-- The platform staff RPC verifies forced-password state from auth.users.
-- Keep that read limited to the columns the check needs.
grant select (id, raw_app_meta_data) on table auth.users to service_role;

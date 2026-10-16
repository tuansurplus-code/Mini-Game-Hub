# Security hardening rollout

1. Apply the compatibility section of the migration (shared rate limiter, safe public prize RPC, campaign-bound claim wrapper, staff self-status policy).
2. Deploy the application with its existing server-only Supabase credential. No new secret or paid service is needed.
3. Once that deployment is READY, apply the enforcement section (remove public raw prize reads and direct play/claim RPC access; enforce active workspaces, staff roles, and AAL2).
4. Run tests/security-regression.cjs, tests/platform-auth-security.cjs, and the rollback-only supabase/tests/security_hardening.sql checks. Verify CSP script nonces on live HTML and check the Supabase advisors.

The application routes all play and claim mutations through server-side validation and an atomic shared rate limiter. The only intentionally anonymous SECURITY DEFINER RPC introduced here is get_public_game_prizes, an explicitly filtered read-only projection that returns display metadata only.

All platform staff must enroll an authenticator at /saas-mfa after password sign-in. Existing verified authenticators are retained. Lost-factor recovery is performed by the Supabase project administrator through Supabase Auth; there is no password-only application bypass.

Leaked-password protection is managed by Supabase Auth and requires a Pro or higher plan. Enable it in Auth settings after upgrading; do not emulate it by sending user passwords to another service.

Previously public fixed coupon codes may need replacement in the merchant's redemption system. The migration preserves existing prize, winner, and coupon records.

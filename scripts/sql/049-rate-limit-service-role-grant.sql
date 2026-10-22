-- Migration 049: let the server call rate_limit_hit().
--
-- 048 revoked EXECUTE from PUBLIC, which also removed service_role's only
-- path to the function — lib/rate-limit.ts then failed open on every
-- request ("permission denied for function rate_limit_hit"). Grant it
-- back to service_role only; anon/authenticated stay revoked.
--
-- Idempotent.

GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, int, int) TO service_role;

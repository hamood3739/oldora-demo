# OLDORA — Safe verification deployment checklist

**Status: code committed, NOT deployed or tested against live Supabase.** This phase performs automated *prechecks*, not final authenticity verification or publishing.

## Prerequisites

1. In Supabase SQL Editor, review and apply `supabase/migrations/20261115_oldora_automated_verification_queue.sql`, followed by `supabase/migrations/20261116_oldora_verification_claim.sql`. This creates the queue, private audit table and read-only seller policies. It does **not** modify existing product records.
2. Confirm the existing seller publication guard is active, and verify RLS and column permissions on `products`. Do not infer protection merely from the presence of a migration file.
3. Deploy `supabase/functions/oldora-verification-worker/index.ts` as the Edge Function named `oldora-verification-worker`. Since it authenticates a custom worker secret rather than a user JWT, the gateway must be configured to allow invocation without JWT verification **only for this function**; the function itself rejects requests without the exact `OLDORA_WORKER_SECRET`. Never remove the function's own authorization check.
4. Configure a high-entropy `OLDORA_WORKER_SECRET` in Supabase Edge Function secrets and use the built-in server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never expose these in client HTML, browser JavaScript or public CI logs.
5. Configure a trusted scheduler to POST to the function with `Authorization: Bearer <OLDORA_WORKER_SECRET>`. Do not schedule until staging tests pass.

## Verify in a safe test environment

- Unauthorized request returns HTTP 401 and performs no work.
- Request with wrong HTTP method returns HTTP 405.
- Seller cannot insert, update or delete verification jobs or events.
- Seller cannot set `status='published'` or `age_verified=true`.
- Eligible pending test listing queues exactly once.
- Missing title, repairs disclosure, invalid age, fewer than five photos, malformed paths and missing private photo objects lead to `needs_info`.
- All basic checks passing leads to `ready_for_evidence` **only**, not `published`.
- A claimed age is not independent proof. No verified badge is issued by the precheck.
- Private photos are not made public. Existing listings, commissions and conversations are unchanged.
- Concurrent worker claims use a transactional `FOR UPDATE SKIP LOCKED` function. Verify parallel invocations claim distinct jobs. Retry and failure recovery still require testing and implementation before production scheduling.
- Published listing and two-way chat flow must be tested using separate buyer and seller accounts once a trusted publication pipeline exists.

## Known limitations before launch

- No independent age/authenticity evidence engine is implemented.
- No trusted publishing transition or public media copy workflow is implemented.
- Queue does not currently retry failed jobs automatically.
- Event logging and state updates are separate operations, not an atomic transaction.
- Current file existence check uses Storage list, which must be tested with actual bucket configuration.
- The worker has not been deployed or run. **Do not enable automated publishing based on this code alone.**

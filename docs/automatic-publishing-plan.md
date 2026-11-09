# OLDORA — Safe automatic publishing rollout

Status: **Design and implementation checklist — NOT deployed**.

## Agreed user experience
1. Seller submits an item. Listing stays `pending` while automated checks run.
2. The server checks required fields, 20+ year age, 5–10 images, permitted content, repair disclosure, image-path ownership, and duplicates.
3. When reliable evidence is insufficient, mark `needs_review` or `needs_info`; do not automatically certify age.
4. Only a trusted backend can change `pending` to `published`. A seller must never be able to approve their own listing.
5. A buyer can message the seller **after** publication; chat must enforce authentication and per-conversation access.
6. Keep original private photos inaccessible until the publication pipeline copies approved media to the public bucket.
7. Maintain a moderation audit trail and reporting/appeal mechanisms.

## Security prerequisites before enabling automatic publishing
- Verify existing Supabase RLS and revoke seller permission to update `status`, `age_verified`, and moderation fields; apply a database trigger or column-level grants as defense in depth.
- Verify the trusted publishing service's credentials are server-side only. Never put service-role keys in GitHub Pages JavaScript.
- Check actual object existence and ownership in private storage, not just client-submitted paths.
- Confirm required product fields against live schema, and establish authoritative age evidence standards.
- Introduce `verification_checks` and `moderation_events` tables and a queue with retries.
- Copy only approved photos into `approved-product-media`; do not make `product-media` public.
- Ensure approved listing edits re-enter verification.
- Test abuse cases (seller attempts status update, forged image paths, duplicate items, invalid age, moderation bypass, chat access to other users).

## First release
Start with deterministic automated checks and human escalation. Image AI can be added only after reliability and privacy testing. **No claim of automated age authentication based on images alone.**

## Current code status
The GitHub Pages dashboard still submits listings with `status: 'pending'`. No auto-publishing server, moderation approval, or buyer chat is deployed by this document.

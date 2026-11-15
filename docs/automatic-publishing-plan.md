# OLDORA — Automated verification, publication and buyer selection

Status: **Launch preparation only. Automated publishing is NOT deployed.**

## Approved product lifecycle

1. Seller submits a listing with required fields, 5–10 private photographs, restoration/repair disclosure, and acceptance of the 2% sale commission.
2. Listing remains `pending`. The seller cannot mark it verified or published.
3. Automated checks evaluate completeness, age/year consistency, allowed category, image count and path ownership, and required disclosure. Eligible categories: ordinary vintage items **20 years or older**, and **Retro Collectibles 15–19 years**. Never introduce a Modern category or Musical Instruments.
4. A trusted server-side verification workflow must verify that photo objects actually exist in private storage and perform permitted-content and duplicate checks. Seller-provided age is **not** independently authenticated by form checks alone.
5. If checks are inconclusive, keep the item unpublished with an appropriate automated `needs_info` / verification-pending result; never falsely award a verified badge. No manual Admin review is required for the initial launch.
6. Only after verification is genuinely complete may a trusted backend set `age_verified=true` and `status='published'` in a controlled transaction, with an audit record.
7. Copy or transform only approved photos into the separate `approved-product-media` public bucket. Keep pending images private.
8. Once published, the item becomes visible in the public collection with its category, price and product page. Buyers can select it, view details and use the **Private Chat** button beneath the product. Conversations remain accessible only to the buyer and seller; the seller replies from Messages.
9. On a completed sale, the seller records the final sale price. OLDORA calculates a **2% commission** and records it as due; do not treat it as collected automatically.

## Already implemented in the repository

- Public catalog in `index.html` filters `status='published'` and `age_verified=true`, links to `product.html`.
- Public product page in `product.html` uses the same visibility checks and links to `messages.html?product=...`.
- Private chat database migration in `supabase/migrations/20261110_oldora_private_messages.sql` requires a published, verified product for new conversations and restricts messages to the participants.
- Seller dashboard has readiness checks and listing/commission management. The readiness function is **read-only**.
- Seller-publication guard exists as a migration, but deployment and live permissions require confirmation.

## Required before activating automatic publication

- Confirm actual Supabase migration status, RLS, seller column permissions and the publication guard on the live database.
- Implement a trusted server-side queue/worker and audit trail. No service-role secrets in GitHub Pages or browser JavaScript.
- Verify private photo existence and ownership; safely copy approved images into the public bucket.
- Implement automated permitted-content and duplicate screening, and a defensible verification policy for item age. Do not claim an item was independently verified without adequate evidence.
- Confirm the server-side publish transition cannot be called by a seller and is safe to retry.
- Test published item visibility, image access, selection, chat creation, buyer-to-seller and seller-to-buyer messages, and negative authorization cases using separate test accounts.
- Confirm English/Arabic UI in both directions, including dynamically created messages, on iPhone Safari.
- Preserve existing listings, photos, commission records, privacy rules and approved branding throughout.

## Release gate

**Do not enable automatic publication or promise error-free operation until the above checks pass in the live environment.** This document is a plan, not proof of a working deployment.

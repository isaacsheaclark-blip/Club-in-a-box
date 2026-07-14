# Club in a Box — starter prototype

A self-onboarding tool for UK padel club founders: an eight-question survey generates a
personalised legal & admin roadmap, a partner referral marketplace, and a compliance calendar.

## What's here right now

Plain HTML/CSS/JS, no build step, no framework, no dependencies. Open `index.html` in a
browser and it works. This is deliberate — it's the fastest way to get something live and
testable with real founders before investing in a proper stack.

**Persistence (step 1) and email delivery (step 2) are wired up.** Submissions and module
status save to Supabase, and submitting the quiz sends the founder their roadmap by email
via Resend — see the setup sections below. Without configuration the app falls back to its
original in-memory, no-email behaviour. There's still no real payment for partner
introductions, and the "AI summary" is rule-based text generation, not a live model call.

## Setting up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run [`supabase-schema.sql`](supabase-schema.sql) — it creates the
   `submissions` and `module_status` tables with row-level security policies.
3. In Settings > API, copy the Project URL and the `anon` public key.
4. Paste them into [`supabase-config.js`](supabase-config.js) as `SUPABASE_URL` and
   `SUPABASE_ANON_KEY`.
5. Open `index.html`. Submitting the quiz now creates a row in `submissions`, and toggling
   a module's status upserts into `module_status`. Refreshing the page restores the
   dashboard (via a submission id kept in `localStorage`) instead of resetting.

Leaving `supabase-config.js` with its placeholder values keeps the app in its original
in-memory-only mode — nothing breaks if you skip this.

## Setting up email delivery

Sending mail needs an API key, which can't live in client-side code — so this runs as a
Supabase Edge Function ([`supabase/functions/smart-responder/index.ts`](supabase/functions/smart-responder/index.ts))
rather than a call straight from `app.js`.

1. Create a free account at [resend.com](https://resend.com) and grab an API key from the
   dashboard. Don't paste it into the codebase — it goes into Supabase as a secret (step 3).
2. In the Supabase Dashboard, go to **Edge Functions > Deploy a new function**, name it
   `smart-responder`, and paste in the contents of `supabase/functions/smart-responder/index.ts`.
3. Under **Edge Functions > Manage secrets**, add `RESEND_API_KEY` with the key from step 1.
   Keep it out of the repo — it's a real secret, unlike the Supabase anon key.
4. Optional: set a `RESEND_FROM` secret (e.g. `"Club in a Box <hello@yourdomain.com>"`) once
   you've verified a sending domain in Resend. Without it, mail sends from Resend's shared
   `onboarding@resend.dev` address, which is fine for testing but not for real founders.
5. Submitting the quiz now calls this function and emails the roadmap to the address entered
   on the capture screen. Failures are logged to the console and don't block the dashboard —
   a missing or misconfigured function degrades gracefully, same as Supabase itself.

## Suggested build sequence (in order of priority)

1. ~~**Persistence.**~~ Done — see "Setting up Supabase" above.

2. ~~**Real email delivery.**~~ Done — see "Setting up email delivery" above.

3. **A live AI summary.** Replace `buildSummary()` in `app.js` with a real call to the Claude
   API. Anthropic's `/v1/messages` endpoint is the right fit here — send the founder's answers
   plus a curated knowledge base of UK padel-specific regulatory patterns (SEIS/EIS eligibility
   quirks, HMRC's evidence expectations, DBS/safeguarding requirements) as context, and ask for
   a short, prioritised summary. This needs a real backend (a small serverless function is
   enough) since API keys can't live in client-side code.

4. **Deploy it.** Push this folder to a GitHub repo, connect it to Vercel or Netlify (both have
   generous free tiers and deploy automatically on every push). No build step needed for the
   current static version.

5. **Partner unlock → real payment.** Once you've validated that founders will engage with the
   Partners tab, wire up Stripe Checkout for the "Unlock introduction" buttons. Start simple —
   a fixed price per unlock — before considering bundles or firm-side pricing.

## What NOT to build yet

- User accounts / login — email capture is enough for now
- A CMS for editing module content — just edit `app.js` directly while the module set is
  still changing based on real founder feedback
- Anything for the specialist-firm side (their own portal, lead dashboards, etc.) — that's
  only worth building once you have real volume to justify it

## A note on the legal content

The module content in `buildModules()` reflects general patterns (HMRC's approach to
land/licence-fee exclusions for leisure trades, DBS requirements for youth coaching, etc.),
not advice on any specific real case. Keep it that way — this file should never contain
details from actual client matters. The disclaimer text in the app itself should stay visible
on every roadmap view; don't let that get lost as the UI evolves.

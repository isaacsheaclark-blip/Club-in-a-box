# Club in a Box — starter prototype

A self-onboarding tool for UK padel club founders: an eight-question survey generates a
personalised legal & admin roadmap, a partner referral marketplace, and a compliance calendar.

## What's here right now

Plain HTML/CSS/JS, no build step, no framework, no dependencies. Open `index.html` in a
browser and it works. This is deliberate — it's the fastest way to get something live and
testable with real founders before investing in a proper stack.

**Persistence (step 1) and email delivery (step 2) are wired up and live** at
[club-in-a-box.vercel.app](https://club-in-a-box.vercel.app) (step 4, deployment, is also
done). Submissions and module status save to Supabase, and submitting the quiz emails the
founder their roadmap via Resend — see the setup sections below. The AI summary (step 3)
is coded but not yet deployed — see "Setting up the AI summary" for when you're ready.
Without configuration each piece falls back gracefully to its original behaviour (in-memory
state, no email, rule-based summary text). There's still no real payment for partner
introductions.

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

## Setting up the AI summary

Not yet done — pick this up when ready to spend real money (rough cost: well under $1/month
at a few requests a day on Sonnet 4.6, but the API key requires a funded Anthropic account,
unlike Supabase/Resend's free tiers). The code is already written and just needs deploying.

Same pattern again: the Anthropic API key can't live in client-side code, so this is another
Supabase Edge Function ([`supabase/functions/ai-summary/index.ts`](supabase/functions/ai-summary/index.ts))
that calls Claude's `/v1/messages` endpoint with the founder's answers, their generated
modules, and a curated knowledge base of UK padel regulatory patterns (SEIS/EIS eligibility,
HMRC evidence expectations, DBS/safeguarding requirements).

1. Get an API key from the [Anthropic Console](https://console.anthropic.com).
2. In the Supabase Dashboard, go to **Edge Functions > Deploy a new function**, name it
   `ai-summary`, and paste in the contents of `supabase/functions/ai-summary/index.ts`.
3. Under **Edge Functions > Manage secrets**, add a secret named exactly `ANTHROPIC_API_KEY`
   with the key from step 1. Get the name exactly right — env var names are case-sensitive
   and must match what the function reads (`Deno.env.get("ANTHROPIC_API_KEY")`); a mismatch
   is a common cause of "not configured" errors here (as it was with `RESEND_API_KEY` above).
4. The dashboard now fetches a live, personalised summary on load and swaps it in once it
   arrives, labelled "Summary — AI generated." Until it resolves (or if it fails), the
   original rule-based `buildSummary()` text is shown instead, so the roadmap is never blank.

## Suggested build sequence (in order of priority)

1. ~~**Persistence.**~~ Done — see "Setting up Supabase" above.

2. ~~**Real email delivery.**~~ Done — see "Setting up email delivery" above.

3. **A live AI summary.** Code written, not yet deployed — see "Setting up the AI summary"
   above. Deferred until ready to fund an Anthropic API key (Supabase and Resend are free at
   this scale; this is the one step with a real, if small, ongoing cost).

4. ~~**Deploy it.**~~ Done — live at [club-in-a-box.vercel.app](https://club-in-a-box.vercel.app),
   auto-deploying from GitHub on every push to `main`.

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

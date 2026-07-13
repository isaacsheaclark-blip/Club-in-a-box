# Club in a Box — starter prototype

A self-onboarding tool for UK padel club founders: an eight-question survey generates a
personalised legal & admin roadmap, a partner referral marketplace, and a compliance calendar.

## What's here right now

Plain HTML/CSS/JS, no build step, no framework, no dependencies. Open `index.html` in a
browser and it works. This is deliberate — it's the fastest way to get something live and
testable with real founders before investing in a proper stack.

**Persistence (step 1) is wired up.** Submissions and module status now save to Supabase
if you've configured it — see "Setting up Supabase" below. Without configuration the app
still runs entirely in memory, same as before. There's still no real email sending, no
real payment for partner introductions, and the "AI summary" is rule-based text
generation, not a live model call.

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

## Suggested build sequence (in order of priority)

1. ~~**Persistence.**~~ Done — see "Setting up Supabase" above.

2. **Real email delivery.** When someone submits their email on the capture screen, actually
   send them their roadmap (Resend or Postmark are simple to wire up). This is also your
   lead list — treat it as the actual point of the free tool, not an afterthought.

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

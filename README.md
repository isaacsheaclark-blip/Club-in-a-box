# Club in a Box — starter prototype

A self-onboarding tool for UK padel club founders: an eight-question survey generates a
personalised legal & admin roadmap, a partner referral marketplace, and a compliance calendar.

## What's here right now

Plain HTML/CSS/JS, no build step, no framework, no dependencies. Open `index.html` in a
browser and it works. This is deliberate — it's the fastest way to get something live and
testable with real founders before investing in a proper stack.

**Everything currently runs in memory.** Refresh the page and it resets. There's no real
database, no real email sending, no real payment for partner introductions, and the
"AI summary" is rule-based text generation, not a live model call.

## Suggested build sequence (in order of priority)

1. **Persistence.** Add Supabase (free tier is fine at this scale). Two tables to start:
   `submissions` (email, answers, timestamp) and `module_status` (submission_id, module_id,
   status). This alone turns the tool from a demo into something with real usage data.

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

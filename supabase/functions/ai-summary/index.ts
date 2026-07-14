// Generates a short, prioritised roadmap summary using the Claude API.
// Deploy this in the Supabase Dashboard: Edge Functions > Deploy a new function > "ai-summary".
// Requires an ANTHROPIC_API_KEY secret (Edge Functions > Manage secrets).

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-sonnet-4-6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KNOWLEDGE_BASE = `
UK padel club regulatory patterns to draw on:
- SEIS/EIS: court-hire income can read to HMRC as a licence fee from land, which is an excluded
  activity. A revenue mix leaning on coaching, membership, and events gives a stronger case;
  court-hire-only clubs face real difficulty qualifying. CASC status is a real alternative for
  community-focused founders, but is generally not compatible with chasing investor equity returns.
- HMRC evidence expectations for SEIS/EIS on leased or licensed sites: customer numbers per
  activity, pricing across all activities (not just court hire), payment model, booking platform
  details, equipment hire charges, staffing and PAYE details, landlord commercial terms, and a
  3-year cashflow broken down by revenue stream.
- Safeguarding/DBS: coaching under-18s requires enhanced DBS checks for coaching/supervising staff,
  a barred list check for regulated activity, a written safeguarding policy with a named lead, and
  a DBS renewal cadence (commonly every 3 years).
- Tenure: freehold brings planning and title work; leases raise turnover rent and mixed-use clauses;
  licences (e.g. school or council land) work differently from leases and need their own review.
- Alcohol/music licensing is typically slow — worth starting early if a bar is planned or possible.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { answers, modules } = await req.json();
    if (!answers || !Array.isArray(modules)) {
      return new Response(JSON.stringify({ error: "Missing answers or modules" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modulesText = modules
      .map((m: { stage: string; title: string; status: string }) => `- [${m.stage}] ${m.title} (${m.status})`)
      .join("\n");

    const userMessage = `Founder's survey answers (JSON): ${JSON.stringify(answers)}

Their generated roadmap modules:
${modulesText}

Write a short, prioritised summary (3-5 sentences, plain text, no markdown) for this founder. Ground
it in their specific answers and flag anything from the knowledge base that materially applies to
their situation. Close by naming the 1-3 modules they should tackle first. Do not invent facts beyond
the knowledge base and their answers, and do not give definitive legal advice — this is general
guidance only.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: `You are writing for UK padel club founders using a legal & admin roadmap tool. ${KNOWLEDGE_BASE}`,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text();
      return new Response(JSON.stringify({ error: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await anthropicRes.json();
    const summary = data.content?.[0]?.text?.trim();
    if (!summary) {
      return new Response(JSON.stringify({ error: "Empty response from Claude" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

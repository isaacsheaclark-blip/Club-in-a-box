// Sends the founder's roadmap by email via Resend.
// Deploy this in the Supabase Dashboard: Edge Functions > Deploy a new function > "smart-responder".
// Requires a RESEND_API_KEY secret (Edge Functions > Manage secrets). Optionally set
// RESEND_FROM (defaults to Resend's shared onboarding sender, fine for testing).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Club in a Box <onboarding@resend.dev>";
const STAGES = ["Formation", "Pre-launch", "Launch", "Growth"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
}

function buildEmailHtml(summary: string, modules: { stage: string; title: string; note: string }[]) {
  const sections = STAGES.map((stage) => {
    const items = modules.filter((m) => m.stage === stage);
    if (!items.length) return "";
    const rows = items.map((m) => `<li><strong>${escapeHtml(m.title)}</strong> — ${escapeHtml(m.note)}</li>`).join("");
    return `<h3>${stage}</h3><ul>${rows}</ul>`;
  }).join("");

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Club in a Box roadmap</h2>
      <p>${escapeHtml(summary)}</p>
      ${sections}
      <p style="font-size: 12px; color: #666;">This roadmap gives general guidance based on your answers.
      It isn't advice on your specific circumstances, and it isn't a substitute for speaking to a qualified adviser.</p>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email, summary, modules } = await req.json();
    if (!email || !summary || !Array.isArray(modules)) {
      return new Response(JSON.stringify({ error: "Missing email, summary, or modules" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: "Your Club in a Box roadmap",
        html: buildEmailHtml(summary, modules),
      }),
    });

    if (!resendRes.ok) {
      const text = await resendRes.text();
      return new Response(JSON.stringify({ error: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

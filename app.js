// Club in a Box — starter prototype
// Persists submissions and module status to Supabase when supabase-config.js is
// filled in; otherwise falls back to the original in-memory-only behaviour.
// See README.md for the suggested build sequence in Claude Code.

const SUBMISSION_STORAGE_KEY = "clubInABoxSubmissionId";

const supabaseClient = (typeof SUPABASE_URL !== "undefined" && SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_URL" && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

async function saveModuleStatus(submissionId, moduleId, status) {
  if (!supabaseClient || !submissionId) return;
  const { error } = await supabaseClient
    .from("module_status")
    .upsert({ submission_id: submissionId, module_id: moduleId, status }, { onConflict: "submission_id,module_id" });
  if (error) console.error("Failed to save module status:", error);
}

const BASE_QUESTIONS = [
  { id: "founders", q: "How many people are founding and funding this?", options: [
    { v: "solo", l: "Just me" }, { v: "cofounders", l: "Me plus 1-2 co-founders" }, { v: "investors", l: "Multiple outside investors" }
  ]},
  { id: "tenure", q: "How will you hold the site?", options: [
    { v: "own", l: "Buying the freehold" }, { v: "lease", l: "Leasing" }, { v: "licence", l: "Licence — school or council land" }
  ]},
  { id: "revenue", q: "What's your expected revenue mix?", options: [
    { v: "courtsonly", l: "Mostly court hire and bookings" }, { v: "balanced", l: "Balanced — courts, coaching, membership, events" },
    { v: "coaching", l: "Coaching and academy led" }, { v: "hospitality", l: "Hospitality-heavy — bar, cafe, events" }
  ]},
  { id: "funding", q: "How are you funding this?", options: [
    { v: "bootstrapped", l: "Self-funded or bootstrapped" }, { v: "friendsfamily", l: "Raising from a few individuals" },
    { v: "seis", l: "Hoping for SEIS or EIS investment" }, { v: "institutional", l: "Institutional or PE-backed" }
  ]},
  { id: "coaches", q: "How will you engage coaches?", options: [
    { v: "employed", l: "Employ them directly" }, { v: "selfemployed", l: "Self-employed contractors" },
    { v: "mix", l: "A mix of both" }, { v: "unsure", l: "Not sure yet" }
  ]},
  { id: "juniors", q: "Will you coach under-18s?", options: [
    { v: "yes", l: "Yes" }, { v: "no", l: "No" }, { v: "unsure", l: "Not sure yet" }
  ]},
  { id: "bar", q: "Planning a bar or clubhouse serving alcohol?", options: [
    { v: "yes", l: "Yes" }, { v: "maybe", l: "Maybe later" }, { v: "no", l: "No" }
  ]},
  { id: "scale", q: "Single site, or bigger ambitions?", options: [
    { v: "single", l: "Single site for now" }, { v: "expand", l: "Planning to expand to more sites" }, { v: "franchise", l: "Franchising the concept out" }
  ]}
];

const SEIS_PREF_Q = { id: "seispref", q: "SEIS is a hard fit for court-hire-heavy clubs. Where do you actually sit?", options: [
  { v: "investor", l: "Investor returns matter — stick with SEIS/EIS" },
  { v: "community", l: "Community-focused — open to CASC instead" },
  { v: "unsure", l: "Not sure yet — show me both" }
]};

function getQuestionList(a) {
  const list = [...BASE_QUESTIONS];
  if (a.funding === "seis") {
    const idx = list.findIndex(q => q.id === "funding");
    list.splice(idx + 1, 0, SEIS_PREF_Q);
  }
  return list;
}

const STAGES = ["Formation", "Pre-launch", "Launch", "Growth"];

const PARTNER_CATS = [
  { id: "property", name: "Real estate and construction", desc: "Lease, licence, and planning compliance for building your courts.", firm: "TBC — your real estate partner", always: true },
  { id: "licensing", name: "Alcohol and music licensing", desc: "Licence applications for your bar or clubhouse.", firm: "TBC — your licensing partner", needsBar: true },
  { id: "insurance", name: "Insurance", desc: "Public liability, employer's liability, and site cover.", firm: "TBC — your insurance partner", always: true },
  { id: "trademark", name: "Trademark and brand protection", desc: "Registering your name and logo before someone else does.", firm: "TBC — your IP partner", always: true }
];

let state = {
  view: "quiz",        // quiz | email | dashboard
  step: 0,
  answers: {},
  modules: null,
  dashTab: "roadmap",
  unlocked: {},
  email: "",
  submissionId: null
};

function buildModules(a) {
  const m = []; let n = 0;
  const add = (stage, owner, title, note, checklist, tag) => m.push({ id: "m" + (n++), stage, owner, title, note, checklist: checklist || null, tag: tag || null, status: "not_started" });

  add("Formation", "direct", "Company formation and structure",
    a.founders === "solo" ? "A limited company for liability protection, simple single-shareholder structure to start." :
    a.founders === "cofounders" ? "A limited company plus a founders' agreement covering decisions, exits, and vesting." :
    "A limited company with a proper shareholders' agreement covering investor rights and exits.");

  if (a.funding === "seis") {
    if (a.seispref === "community" || a.seispref === "unsure") {
      add("Formation", "direct", "CASC status — an alternative worth weighing",
        "Community Amateur Sports Club status brings business rate relief and Gift Aid, but it's generally not built for investors chasing equity returns — largely an alternative to SEIS, not a complement.");
    }
    if (a.seispref !== "community") {
      let tag, note;
      if (a.revenue === "courtsonly") { tag = "Unlikely"; note = "Court hire income can read to HMRC as a licence fee from land, an excluded activity. Worth talking through before applying."; }
      else if (a.revenue === "balanced" || a.revenue === "coaching") { tag = "Possible"; note = "A mix leaning on coaching, membership and events gives you a real shot, if court-hire stays clearly minor."; }
      else { tag = "Worth checking"; note = "Hospitality revenue is generally fine, but the court-hire element still needs scrutiny."; }
      add("Formation", "direct", "SEIS or EIS eligibility", note, null, tag);
      if (a.tenure === "lease" || a.tenure === "licence") {
        add("Formation", "direct", "HMRC evidence checklist", "For a leased or licensed site, HMRC digs deeper to confirm this is a genuine trade. Worth preparing:",
          ["Customer numbers per activity, and what drives most demand", "Pricing for every activity, not just court hire",
           "Payment model — membership vs pay-as-you-play", "Booking platform and package inclusions", "Equipment hire details and charges",
           "Who handles maintenance and upkeep", "Staffing: roles, PAYE reference, sample rota" + (a.juniors !== "no" ? ", including DBS status for staff working with juniors" : ""),
           "Full commercial terms with the landlord", "3-year cashflow with revenue streams by percentage"]);
      }
    }
  } else if (a.funding === "friendsfamily" || a.funding === "institutional") {
    add("Formation", "direct", "Investment documentation",
      a.funding === "friendsfamily" ? "Loan or investment agreements suited to a small group of individual backers." : "Institutional-grade investment agreements and cap table structuring.");
  }

  add("Formation", "referred", "Trademark and brand protection", "Registering your club name and logo early, before someone else does.", null, "Referred");

  add("Pre-launch", "referred", a.tenure === "own" ? "Freehold purchase and planning" : a.tenure === "lease" ? "Lease negotiation and planning" : "Licence agreement and planning",
    a.tenure === "licence" ? "Licence agreements work differently to a lease. Referred to a real estate specialist." :
    a.tenure === "lease" ? "Turnover rent, mixed-use clauses, headlease consent. Referred to a real estate specialist." :
    "Freehold purchase brings its own planning and title work. Referred to a real estate specialist.", null, "Referred");

  add("Pre-launch", "referred", "Construction and site compliance",
    "Building regulations for court structures, accessibility, and safety sign-off before opening.",
    ["Planning permission for structures and lighting", "Building regulations compliance", "Accessibility requirements", "Safety certification before opening", "Noise and light impact if neighbours are close by"], "Referred");

  add("Pre-launch", "referred", "Insurance", "Public liability and employer's liability — required the moment you have staff.",
    ["Public liability cover", "Employer's liability — legally required with any staff", "Contents and equipment cover", "Business interruption, worth considering"], "Referred");

  const dbsChecklist = a.juniors !== "no" ? ["Enhanced DBS check for anyone coaching or supervising under-18s", "Barred list check if the role is regulated activity", "Safer recruitment — checks done before someone starts"] : null;
  add("Pre-launch", "direct", "Coach and staff contracts",
    a.coaches === "employed" ? "Employment contracts, PAYE registration, and the obligations of directly employing coaches." :
    a.coaches === "selfemployed" ? "Contractor agreements that correctly reflect self-employed status." :
    a.coaches === "mix" ? "You'll need both employment contracts and contractor agreements." :
    "Worth deciding early — the right contract depends on employment status.", dbsChecklist);

  if (a.juniors !== "no") {
    add("Pre-launch", "direct", "Safeguarding policy",
      a.juniors === "yes" ? "A genuine compliance requirement once under-18s are being coached." : "Worth having in place now in case you coach juniors later.",
      ["Written, dated safeguarding policy", "Enhanced DBS checks for coaching staff", "A DBS renewal cadence", "A named safeguarding lead"]);
  }

  add("Pre-launch", "direct", "Health and safety", "Risk assessments for the sport itself and basic first aid provision.",
    ["Risk assessment for play and facilities", "First aid provision on site", "Accident and RIDDOR reporting process", "Regular review as the site changes"]);

  add("Pre-launch", "direct", "Supplier and software agreements", "Booking platform terms, equipment suppliers, POS providers — flagged before you sign.");
  add("Launch", "direct", "Membership terms and waivers", "Cancellation policy and liability waivers.");
  add("Launch", "direct", "Data protection", "Member data, payment details, and booking-app data all need a proper legal basis.",
    ["Privacy notice for members", "Data processing agreement with your booking platform", "CCTV policy if you're using it"]);

  if (a.bar !== "no") add("Launch", "referred", "Alcohol and music licensing", a.bar === "yes" ? "Needed before you open the bar." : "Worth scoping now — licensing timelines can be slow.", null, "Referred");

  if (a.scale !== "single") {
    add("Growth", "direct", a.scale === "franchise" ? "Franchise structuring" : "Multi-site expansion",
      a.scale === "franchise" ? "Worth planning franchise structure before site one even opens." : "Replicating agreements across a second site is easier if the first is built with that in mind.");
  }
  return m;
}

function buildSummary(a, mods) {
  const direct = mods.filter(m => m.owner === "direct" && m.status === "not_started").slice(0, 3);
  const partSize = a.founders === "solo" ? "you're going it alone" : a.founders === "cofounders" ? "you've got co-founders on board" : "you're bringing in outside investors";
  const siteBit = a.tenure === "licence" ? "on a licensed site" : a.tenure === "lease" ? "on a leased site" : "on a freehold site";
  let fundingBit = "";
  if (a.funding === "seis") {
    if (a.seispref === "community") fundingBit = "Given your community focus, CASC is worth weighing seriously against SEIS rather than defaulting to the harder route.";
    else if (a.revenue === "courtsonly") fundingBit = "Worth knowing early: SEIS looks unlikely with a court-hire-heavy revenue mix, so it's worth a plan B before you bank on it.";
    else fundingBit = "SEIS looks realistically achievable if you keep documenting your non-court-hire revenue clearly.";
  } else if (a.funding === "bootstrapped") {
    fundingBit = "Bootstrapped means fewer investment documents to worry about, but the same operational and compliance groundwork still applies.";
  }
  const juniorsBit = a.juniors !== "no" ? "Since you'll be coaching juniors, get safeguarding and DBS checks sorted before you open, not after." : "";
  const priorityNames = direct.map(m => m.title.toLowerCase()).join(", ");
  return `You're setting up ${partSize}, ${siteBit}. ${fundingBit} ${juniorsBit} Start with ${priorityNames || "your formation paperwork"} — those unlock most of what follows.`;
}

function nextStatus(s) { return s === "not_started" ? "in_progress" : s === "in_progress" ? "complete" : "not_started"; }
function statusLabel(s) { return s === "not_started" ? "Not started" : s === "in_progress" ? "In progress" : "Complete"; }

function calendarItems(a) {
  const items = [
    { t: "Confirmation statement and annual accounts", c: "Annual" },
    { t: "Insurance policy renewal", c: "Annual" },
    { t: "Trademark renewal", c: "Every 10 years once registered" },
    { t: "Privacy notice and data protection review", c: "Annual review recommended" }
  ];
  if (a.juniors !== "no") {
    items.push({ t: "DBS renewal check", c: "Recommended every 3 years" });
    items.push({ t: "Safeguarding policy review", c: "Annual review recommended" });
  }
  if (a.bar !== "no") items.push({ t: "Alcohol and music licence renewal", c: "Check licence terms, typically annual" });
  return items;
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  if (state.view === "quiz") {
    const qlist = getQuestionList(state.answers);
    const question = qlist[state.step];
    const progress = Math.round((state.step / qlist.length) * 100);

    app.appendChild(el(`
      <div>
        <div class="header">
          <p class="eyebrow">Club in a Box</p>
          <h1>Question ${state.step + 1} of ${qlist.length}</h1>
        </div>
        <div class="content">
          <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
          <div class="question"><h2>${question.q}</h2></div>
          <div id="opts"></div>
          ${state.step > 0 ? '<button class="back-link" id="back-btn">← Back</button>' : ''}
        </div>
      </div>
    `));

    const opts = document.getElementById("opts");
    question.options.forEach(opt => {
      const btn = el(`<button class="opt-btn">${opt.l}</button>`);
      btn.onclick = () => {
        state.answers[question.id] = opt.v;
        const newList = getQuestionList(state.answers);
        if (state.step < newList.length - 1) { state.step++; }
        else { state.modules = buildModules(state.answers); state.view = "email"; }
        render();
      };
      opts.appendChild(btn);
    });
    if (state.step > 0) document.getElementById("back-btn").onclick = () => { state.step--; render(); };
    return;
  }

  if (state.view === "email") {
    app.appendChild(el(`
      <div>
        <div class="header">
          <p class="eyebrow">Club in a Box</p>
          <h1>Where should we send your roadmap?</h1>
        </div>
        <div class="content">
          <div class="email-capture">
            <input type="email" id="email-input" placeholder="you@yourclub.com" />
            <button class="primary-btn" id="email-submit">See my roadmap</button>
          </div>
          <p class="disclaimer">We'll use this to save your roadmap and follow up — not for anything else. This tool gives general guidance based on your answers, it isn't advice on your specific circumstances, and it isn't a substitute for speaking to a qualified adviser.</p>
        </div>
      </div>
    `));
    document.getElementById("email-submit").onclick = async () => {
      state.email = document.getElementById("email-input").value;
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from("submissions")
          .insert({ email: state.email, answers: state.answers })
          .select()
          .single();
        if (error) console.error("Failed to save submission:", error);
        else {
          state.submissionId = data.id;
          localStorage.setItem(SUBMISSION_STORAGE_KEY, data.id);
        }
      }
      state.view = "dashboard";
      render();
    };
    return;
  }

  // dashboard
  const wrapper = el(`
    <div>
      <div class="header">
        <p class="eyebrow">Club in a Box</p>
        <h1>Your club-launch dashboard</h1>
      </div>
      <div class="content">
        <div class="tabs">
          <button class="tab-btn ${state.dashTab === 'roadmap' ? 'active' : ''}" data-tab="roadmap">Roadmap</button>
          <button class="tab-btn ${state.dashTab === 'partners' ? 'active' : ''}" data-tab="partners">Partners</button>
          <button class="tab-btn ${state.dashTab === 'calendar' ? 'active' : ''}" data-tab="calendar">Calendar</button>
        </div>
        <div id="tab-content"></div>
        <button class="ghost-btn back-link" id="restart-btn" style="margin-top:12px;">Retake onboarding</button>
      </div>
    </div>
  `);
  app.appendChild(wrapper);
  wrapper.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => { state.dashTab = btn.getAttribute("data-tab"); render(); };
  });
  document.getElementById("restart-btn").onclick = () => {
    localStorage.removeItem(SUBMISSION_STORAGE_KEY);
    state = { view: "quiz", step: 0, answers: {}, modules: null, dashTab: "roadmap", unlocked: {}, email: "", submissionId: null };
    render();
  };

  const tabContent = document.getElementById("tab-content");

  if (state.dashTab === "roadmap") {
    tabContent.appendChild(el(`
      <div class="summary-card">
        <p class="label">Summary — preview logic, not a live AI call yet</p>
        <p class="body">${buildSummary(state.answers, state.modules)}</p>
      </div>
    `));

    const completeCount = state.modules.filter(m => m.status === "complete").length;
    const pct = Math.round((completeCount / state.modules.length) * 100);
    let currentStageIdx = STAGES.length - 1;
    for (let i = 0; i < STAGES.length; i++) {
      const sm = state.modules.filter(m => m.stage === STAGES[i]);
      if (sm.length && sm.some(m => m.status !== "complete")) { currentStageIdx = i; break; }
    }

    const stepper = el(`<div class="stepper"></div>`);
    STAGES.forEach((s, i) => {
      const item = el(`
        <div class="step-item">
          <div class="step-col">
            <div class="step-circle ${i <= currentStageIdx ? 'active' : ''}">${i + 1}</div>
            <span class="step-label">${s}</span>
          </div>
          ${i < STAGES.length - 1 ? `<div class="step-line ${i < currentStageIdx ? 'active' : ''}"></div>` : ''}
        </div>
      `);
      stepper.appendChild(item);
    });
    tabContent.appendChild(stepper);

    tabContent.appendChild(el(`
      <div class="readiness-card">
        <div class="readiness-row"><span>Overall readiness</span><span>${pct}%</span></div>
        <div class="readiness-track"><div class="readiness-fill" style="width:${pct}%"></div></div>
      </div>
    `));

    STAGES.forEach(stage => {
      const sm = state.modules.filter(m => m.stage === stage);
      if (!sm.length) return;
      tabContent.appendChild(el(`<p class="stage-label">${stage}</p>`));
      sm.forEach(m => {
        const card = el(`
          <div class="module-card">
            <div class="module-head">
              <p class="module-title">${m.title}</p>
              <span class="badge ${m.status}">${statusLabel(m.status)}</span>
            </div>
            <p class="module-note">${m.note}</p>
            ${m.checklist ? `<ul class="module-checklist">${m.checklist.map(i => `<li><span class="dash">—</span><span>${i}</span></li>`).join('')}</ul>` : ''}
            ${m.tag ? `<span class="badge tag">${m.tag}</span>` : ''}
            <button class="cycle-btn" data-id="${m.id}">${m.status === "not_started" ? "Start" : m.status === "in_progress" ? "Mark complete" : "Reopen"}</button>
          </div>
        `);
        card.querySelector(".cycle-btn").onclick = () => {
          const newStatus = nextStatus(m.status);
          state.modules = state.modules.map(x => x.id === m.id ? { ...x, status: newStatus } : x);
          saveModuleStatus(state.submissionId, m.id, newStatus);
          render();
        };
        tabContent.appendChild(card);
      });
    });

    tabContent.appendChild(el(`<p class="disclaimer">This roadmap gives general guidance based on your answers. It isn't advice on your specific circumstances, and it isn't a substitute for speaking to a qualified adviser.</p>`));
  }

  if (state.dashTab === "partners") {
    tabContent.appendChild(el(`<p class="module-note" style="margin-bottom:1rem;">Vetted specialists for the parts outside direct advisory.</p>`));
    PARTNER_CATS.filter(p => p.always || (p.needsBar && state.answers.bar !== "no")).forEach(p => {
      const isUnlocked = !!state.unlocked[p.id];
      const card = el(`
        <div class="partner-card">
          <p class="module-title" style="margin-bottom:4px;">${p.name}</p>
          <p class="module-note">${p.desc}</p>
          ${isUnlocked
            ? `<div class="partner-unlocked"><p>Introduced to ${p.firm}.</p></div>`
            : `<button class="unlock-btn" data-id="${p.id}">Unlock introduction</button>`}
        </div>
      `);
      if (!isUnlocked) {
        card.querySelector(".unlock-btn").onclick = () => { state.unlocked[p.id] = true; render(); };
      }
      tabContent.appendChild(card);
    });
  }

  if (state.dashTab === "calendar") {
    tabContent.appendChild(el(`<p class="module-note" style="margin-bottom:1rem;">Recurring compliance dates, based on your answers.</p>`));
    calendarItems(state.answers).forEach(it => {
      tabContent.appendChild(el(`
        <div class="cal-row"><span>${it.t}</span><span class="cal-cadence">${it.c}</span></div>
      `));
    });
  }
}

async function restoreSession() {
  const savedId = localStorage.getItem(SUBMISSION_STORAGE_KEY);
  if (!supabaseClient || !savedId) { render(); return; }

  const { data: submission, error } = await supabaseClient
    .from("submissions").select("*").eq("id", savedId).single();
  if (error || !submission) {
    localStorage.removeItem(SUBMISSION_STORAGE_KEY);
    render();
    return;
  }

  const { data: statuses } = await supabaseClient
    .from("module_status").select("*").eq("submission_id", savedId);
  const modules = buildModules(submission.answers);
  (statuses || []).forEach(s => {
    const mod = modules.find(m => m.id === s.module_id);
    if (mod) mod.status = s.status;
  });

  state = {
    view: "dashboard", step: 0, answers: submission.answers, modules,
    dashTab: "roadmap", unlocked: {}, email: submission.email, submissionId: submission.id
  };
  render();
}

restoreSession();

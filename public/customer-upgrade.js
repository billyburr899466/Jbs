import { renderDeck } from './deck-visual.js';
import { paintDefaults, paintMarkup, mountPaint } from './paint-visual.js';

import {
  APP_VERSION,
  TIMELINE_STAGES,
  SERVICE_ESTIMATES,
  DECK_BUILDER_MATERIALS,
  calculateDeckBuilder,
  estimateProject,
  statusToStage,
  buildTimeline,
  analyzePhotoMetrics,
  formatMoney,
  formatDate,
  escapeHtml,
  safeImageSource,
  clampText,
} from "./customer-core.js";

const OWNER_EMAILS = new Set(["billyburr89@gmail.com", "jeremiahgrider24@gmail.com"]);
const PUSH_PUBLIC_KEY = "BLhgBkOXOHiqnKHRLGuTw3FPBd8GaYtGWRCroOYK8UjM7ZvkFxNFTuLk33SHHxd_lHFeW1Y3Ao5VXDzuEpTtS4I";

const NAV_ITEMS = [
  ["home", "⌂", "Home"],
  ["projects", "▤", "Projects"],
  ["messages", "✉", "Messages"],
  ["explore", "◈", "Explore"],
  ["more", "•••", "More"],
];

const IDEAS = [
  { id: "deck-refresh", category: "Decks", icon: "▦", title: "Deck Refresh", text: "Replace weak boards, tighten rails, and finish with a durable stain." },
  { id: "covered-entry", category: "Porches", icon: "⌂", title: "Covered Entry", text: "Add shelter, safer steps, and a cleaner first impression." },
  { id: "bright-interior", category: "Painting", icon: "◐", title: "Bright Interior", text: "Fresh walls and ceilings can make smaller rooms feel open and clean." },
  { id: "trailer-floor", category: "Trailers", icon: "▰", title: "Trailer Floor Upgrade", text: "Repair soft areas and add a durable work-ready floor surface." },
  { id: "seamless-gutters", category: "Gutters", icon: "⌁", title: "Seamless Gutter Upgrade", text: "Improve drainage with correctly pitched gutters and downspouts." },
  { id: "roof-renewal", category: "Roofing", icon: "△", title: "Roof Renewal", text: "Plan tear-off, decking repairs, ventilation, and the new roof as one project." },
  { id: "flooring-update", category: "Flooring", icon: "▥", title: "Flooring Update", text: "Compare durable options for busy rooms, pets, moisture, and easy cleaning." },
  { id: "siding-accent", category: "Siding", icon: "▤", title: "Siding & Trim", text: "Pair low-maintenance siding with contrasting trim and clean flashing details." },
];

const COLOR_GROUPS = [
  { name: "Warm White", value: "#F3EFE5", use: "Walls, trim, and bright interiors" },
  { name: "Slate", value: "#4B5668", use: "Siding, doors, and modern accents" },
  { name: "Forest", value: "#365543", use: "Exterior accents and natural palettes" },
  { name: "Deep Navy", value: "#243B5A", use: "Doors, cabinets, and feature walls" },
  { name: "Clay", value: "#A86549", use: "Warm exterior and deck accents" },
  { name: "Charcoal", value: "#2F3338", use: "Roofing, trim, and hardware" },
];

const MAINTENANCE_TASKS = [
  ["spring-gutters", "Spring", "Clean gutters and verify downspout drainage"],
  ["spring-deck", "Spring", "Check deck boards, stairs, rails, and fasteners"],
  ["spring-roof", "Spring", "Inspect roof edges, flashing, and visible damage"],
  ["summer-caulk", "Summer", "Check exterior caulk around doors and windows"],
  ["summer-siding", "Summer", "Wash siding and look for loose panels or trim"],
  ["fall-gutters", "Fall", "Clear leaves before freezing weather"],
  ["fall-weatherstrip", "Fall", "Inspect door sweeps and weatherstripping"],
  ["winter-leaks", "Winter", "Watch ceilings and attic areas for moisture"],
];

function demoImage(label, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="${color}"/><rect x="55" y="55" width="1090" height="650" rx="28" fill="none" stroke="white" stroke-opacity=".55" stroke-width="8"/><text x="600" y="350" fill="white" text-anchor="middle" font-family="Arial,sans-serif" font-size="58" font-weight="700">JB's Demo Project</text><text x="600" y="430" fill="white" text-anchor="middle" font-family="Arial,sans-serif" font-size="42">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const DEMO_RECORDS = [
  {
    id: "demo-deck-project",
    record_type: "project",
    title: "Deck Repair & Refinish",
    customer_name: "Guest Demo Customer",
    customer_email: "demo@example.com",
    status: "Work In Progress",
    current_stage: "work_in_progress",
    record_date: "Aug. 19, 2026",
    location: "Mishawaka, Indiana",
    amount: 4850,
    line_items: [],
    documents: [],
    before_images: [demoImage("Before", "#75543F")],
    proposed_after_images: [demoImage("Approved Plan", "#405C4A")],
  },
  {
    id: "demo-quote",
    record_type: "quote",
    title: "Interior Painting Proposal",
    customer_name: "Guest Demo Customer",
    customer_email: "demo@example.com",
    status: "Quote Sent",
    current_stage: "quote_sent",
    record_date: "Aug. 18, 2026",
    location: "Elkhart, Indiana",
    amount: 4300,
    line_items: [
      { id: "base", label: "Walls and ceilings", amount: 4300, optional: false },
      { id: "trim", label: "Doors and trim", amount: 1150, optional: true },
    ],
    documents: [],
    before_images: [demoImage("Rooms to Paint", "#6F7681")],
    proposed_after_images: [demoImage("White Finish Preview", "#B8B7AE")],
  },
];

const DEMO_EVENTS = [
  { id: "e1", record_id: "demo-deck-project", event_type: "stage", stage: "estimate_requested", title: "Estimate requested", event_date: "2026-08-10T14:00:00Z", created_by_name: "Customer" },
  { id: "e2", record_id: "demo-deck-project", event_type: "stage", stage: "quote_sent", title: "Quote sent", event_date: "2026-08-11T16:30:00Z", created_by_name: "Billy" },
  { id: "e3", record_id: "demo-deck-project", event_type: "stage", stage: "quote_approved", title: "Quote approved", event_date: "2026-08-12T19:10:00Z", created_by_name: "Customer" },
  { id: "e4", record_id: "demo-deck-project", event_type: "stage", stage: "scheduled", title: "Project scheduled", description: "Work scheduled for Aug. 24–26.", event_date: "2026-08-13T15:00:00Z", created_by_name: "Jeremiah" },
  { id: "e5", record_id: "demo-deck-project", event_type: "stage", stage: "materials_ready", title: "Materials ready", event_date: "2026-08-21T18:00:00Z", created_by_name: "Billy" },
  { id: "e6", record_id: "demo-deck-project", event_type: "stage", stage: "work_started", title: "Work started", event_date: "2026-08-24T12:30:00Z", created_by_name: "Billy" },
  { id: "e7", record_id: "demo-deck-project", event_type: "stage", stage: "work_in_progress", title: "Repairs underway", description: "Weak boards were removed and the framing was checked.", event_date: "2026-08-24T17:00:00Z", created_by_name: "Jeremiah" },
  { id: "e8", record_id: "demo-deck-project", event_type: "progress_photo", title: "Day 1 progress", description: "New deck boards installed on the entry side.", event_date: "2026-08-24T18:15:00Z", media: [demoImage("Day 1 Progress", "#9A6B43")], created_by_name: "Jeremiah" },
  { id: "e9", record_id: "demo-deck-project", event_type: "schedule", title: "Schedule update", description: "Staining moved to Wednesday because of rain.", event_date: "2026-08-24T18:30:00Z", created_by_name: "Billy" },
];

const DEMO_MESSAGES = [
  { id: "m1", customer_user_id: "demo", sender_role: "customer", sender_name: "Guest Demo Customer", message: "Will the deck be ready before the weekend?", created_at: "2026-08-23T18:22:00Z" },
  { id: "m2", customer_user_id: "demo", sender_role: "owner", sender_name: "Billy", message: "Yes. We moved the stain day because of rain, but the final walkthrough is still planned for Thursday.", created_at: "2026-08-23T18:29:00Z" },
  { id: "m3", customer_user_id: "demo", sender_role: "owner", sender_name: "Jeremiah", message: "I also added today’s progress photo to your project timeline.", created_at: "2026-08-23T18:31:00Z" },
];

const DEMO_CHANGE_ORDERS = [
  { id: "co1", record_id: "demo-deck-project", title: "Replace two additional stair boards", description: "Two boards showed hidden rot after removal began.", amount: 185, status: "priced", created_at: "2026-08-24T17:30:00Z" },
];

const state = {
  root: null,
  session: null,
  demo: false,
  owner: false,
  view: "home",
  recordId: null,
  loading: false,
  error: "",
  toast: "",
  modal: null,
  quoteStep: 1,
  quoteDraft: {},
  planDraft: {},
  builderStep: 1,
  builderDraft: {},
  builderView: {yaw:-32,elevation:28,zoom:1,top:false,framing:false},
  paintDraft: paintDefaults(),
  previewOwnerSession: null,
  analyzerDraft: { photos: [], result: null },
  signDraft: {},
  changeDraft: {},
  photoDraft: { photos: [] },
  records: [],
  requests: [],
  messages: [],
  reads: [],
  events: [],
  changeOrders: [],
  changeOrderResponses: [],
  plans: [],
  workspace: { maintenance: {}, saved_colors: [], saved_ideas: [], contact_preference: "Text message" },
  quoteResponses: [],
  realtime: [],
  poller: null,
  ownerRoot: null,
  ownerRecords: [],
  ownerEvents: [],
  ownerOrders: [],
  ownerRecordId: "",
  ownerDraft: {},
  ownerOpen: false,
  ownerLoading: false,
};

const client = () => window.__JBS_SUPABASE;
const currentEmail = () => String(state.session?.user?.email || "").toLowerCase();
const displayName = () => state.session?.user?.user_metadata?.full_name || state.session?.user?.user_metadata?.name || currentEmail().split("@")[0] || "Customer";
const eventsFor = (recordId) => state.events.filter((event) => event.record_id === recordId);
const ordersFor = (recordId) => state.changeOrders.filter((order) => order.record_id === recordId);
const responseFor = (quoteId) => state.quoteResponses.find((response) => response.quote_id === quoteId);
const unreadCount = () => state.messages.filter((message) => message.sender_role === "owner" && !state.reads.some((read) => read.message_id === message.id && read.user_id === state.session?.user?.id)).length;

function isInstalled() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function setToast(message) {
  state.toast = message;
  render();
  window.clearTimeout(setToast.timer);
  setToast.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 3200);
}

function shellRoot() {
  let root = document.querySelector("#jbs-customer-upgrade-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "jbs-customer-upgrade-root";
    root.className = "jbs-upgrade-mount jbs-demo-overlay";
    document.body.append(root);
  }
  return root;
}

function startDemo() {
  if (state.owner && !state.demo) state.previewOwnerSession = state.session;
  state.ownerOpen = false;
  if (state.ownerRoot) state.ownerRoot.hidden = true;
  state.modal = null;
  state.workspace = {maintenance:{},saved_colors:[],saved_ideas:[],contact_preference:'In-app message'};
  state.demo = true;
  state.owner = false;
  state.session = { access_token: "demo", user: { id: "demo", email: "demo@example.com", user_metadata: { full_name: "Guest Demo Customer" } } };
  state.root = shellRoot();
  state.records = structuredClone(DEMO_RECORDS);
  state.events = structuredClone(DEMO_EVENTS);
  state.messages = structuredClone(DEMO_MESSAGES);
  state.changeOrders = structuredClone(DEMO_CHANGE_ORDERS);
  state.changeOrderResponses = [];
  state.requests = [{ id: "request-demo", project_type: "Bathroom Update", status: "Reviewing", created_at: "2026-08-20T14:00:00Z" }];
  state.plans = [{ id: "plan-demo", title: "Future Kitchen Plan", project_type: "General Remodeling", notes: "Save cabinet colors and rough measurements.", timeframe: "This winter", budget_min: 7000, budget_max: 12000, measurements: { wall: "12 ft", island: "6 ft" }, materials: ["Warm White", "Deep Navy"], photos: [], status: "draft" }];
  state.quoteResponses = [];
  state.reads = [{ message_id: "m2", user_id: "demo", reader_role: "customer", reader_name: "Guest Demo Customer", read_at: "2026-08-23T18:30:00Z" }];
  state.view = "home";
  state.recordId = null;
  bindRoot();
  render();
}

async function bootCustomer(session) {
  if (!session?.user) return;
  const email = String(session.user.email || "").toLowerCase();
  const sameAccount = !state.demo && state.session?.user?.id === session.user.id;
  if (sameAccount && ((state.owner && state.ownerRoot?.isConnected) || (!state.owner && state.root?.isConnected))) {
    state.session = session;
    return;
  }
  if (OWNER_EMAILS.has(email)) {
    state.demo = false;
    if (state.ownerRoot) state.ownerRoot.hidden = false;
    state.owner = true;
    state.session = session;
    mountOwnerTools();
    return;
  }
  state.demo = false;
  state.owner = false;
  state.session = session;
  state.root = shellRoot();
  bindRoot();
  render();
  await loadCustomerData(true);
  applyOpenIntent();
  subscribeRealtime();
}

function applyOpenIntent() {
  const params = new URLSearchParams(window.location.search);
  const open = params.get("open");
  const recordId = params.get("record");
  if (open === "messages") state.view = "messages";
  if (open === "projects" || open === "quotes") state.view = "projects";
  if (recordId && state.records.some((record) => record.id === recordId)) state.recordId = recordId;
  if (open || recordId) {
    params.delete("open");
    params.delete("record");
    const query = params.toString();
    history.replaceState(history.state, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
    render();
  }
}

function enhanceEntry() {
  if (state.session || document.querySelector(".jbs-demo-entry")) return;
  const card = document.querySelector(".auth-card");
  const version = card?.querySelector(".app-version");
  if (!version) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "auth-switch secondary jbs-demo-entry";
  button.textContent = "Preview the Customer Demo";
  button.addEventListener("click", startDemo);
  card.insertBefore(button, version);
}

async function detectSession() {
  if (!client() || state.demo) return;
  const { data } = await client().auth.getSession();
  const session = data?.session;
  if (session) await bootCustomer(session);
  else enhanceEntry();
  client().auth.onAuthStateChange((_event, nextSession) => {
    if (state.demo) return;
    if (nextSession) bootCustomer(nextSession);
    else {
      state.session = null;
      state.owner = false;
      state.root?.remove();
      state.root = null;
      enhanceEntry();
    }
  });
}

window.addEventListener("jbs:customer-ready", (event) => {
  if (state.demo) return;
  if (window.__JBS_SESSION) bootCustomer(window.__JBS_SESSION);
  else if (event.detail?.userId) detectSession();
});

function waitForApp() {
  if (client()) detectSession();
  else window.setTimeout(waitForApp, 120);
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", waitForApp, { once: true })
  : waitForApp();
window.setInterval(enhanceEntry, 800);

async function loadCustomerData(showLoading = false) {
  if (state.demo || !state.session || !client()) return;
  if (showLoading) {
    state.loading = true;
    render();
  }
  const queries = [
    ["records", client().from("customer_records").select("*").order("updated_at", { ascending: false })],
    ["requests", client().from("quote_requests").select("*").order("created_at", { ascending: false })],
    ["messages", client().from("customer_messages").select("*").order("created_at", { ascending: true })],
    ["reads", client().from("message_reads").select("*")],
    ["events", client().from("project_events").select("*").order("event_date", { ascending: true })],
    ["changeOrders", client().from("change_orders").select("*").order("created_at", { ascending: false })],
    ["changeOrderResponses", client().from("change_order_responses").select("*").order("responded_at", { ascending: false })],
    ["plans", client().from("customer_plans").select("*").order("updated_at", { ascending: false })],
    ["quoteResponses", client().from("quote_responses").select("*").order("updated_at", { ascending: false })],
    ["workspace", client().from("customer_workspace").select("*").eq("user_id", state.session.user.id).maybeSingle()],
  ];
  const results = await Promise.all(queries.map(async ([key, query]) => [key, await query]));
  const failures = [];
  for (const [key, result] of results) {
    if (result.error) {
      failures.push(result.error.message);
      continue;
    }
    if (key === "workspace") {
      if (result.data) state.workspace = { ...state.workspace, ...result.data };
    } else {
      state[key] = result.data || [];
    }
  }
  state.loading = false;
  state.error = failures.length && failures.length === results.length ? "We could not refresh your customer information." : "";
  render();
  if (state.view === "messages") markMessagesRead();
}

function subscribeRealtime() {
  if (state.demo || !client() || state.realtime.length) return;
  const refresh = () => {
    window.clearTimeout(subscribeRealtime.timer);
    subscribeRealtime.timer = window.setTimeout(() => loadCustomerData(false), 350);
  };
  for (const table of ["customer_records", "quote_requests", "customer_messages", "message_reads", "project_events", "change_orders", "change_order_responses", "customer_plans"]) {
    const channel = client()
      .channel(`customer-upgrade-${table}-${state.session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, refresh)
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.error("[JBs realtime]", status, error);
      });
    state.realtime.push(channel);
  }
  window.clearInterval(state.poller);
  state.poller = window.setInterval(() => loadCustomerData(false), 30_000);
}

function ownerSelectedRecord() {
  return state.ownerRecords.find((record) => record.id === state.ownerRecordId) || null;
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

async function mountOwnerTools() {
  if (!state.ownerRoot) {
    const root = document.createElement("div");
    root.id = "jbs-owner-upgrade-root";
    document.body.append(root);
    root.addEventListener("click", handleOwnerClick);
    root.addEventListener("input", handleOwnerInput);
    root.addEventListener("change", handleOwnerChange);
    state.ownerRoot = root;
  }
  renderOwnerTools();
  await loadOwnerData();
}

async function loadOwnerData() {
  if (!state.owner || !client()) return;
  state.ownerLoading = true;
  renderOwnerTools();
  const [recordsResult, eventsResult, ordersResult] = await Promise.all([
    client().from("customer_records").select("*").order("updated_at", { ascending: false }),
    client().from("project_events").select("*").order("event_date", { ascending: false }),
    client().from("change_orders").select("*").order("created_at", { ascending: false }),
  ]);
  state.ownerLoading = false;
  const firstError = recordsResult.error || eventsResult.error || ordersResult.error;
  if (firstError) {
    console.error("[JBs owner upgrade]", firstError);
    state.ownerDraft.error = "The upgrade data could not be refreshed yet.";
  } else {
    state.ownerDraft.error = "";
    state.ownerRecords = (recordsResult.data || []).filter((record) => Boolean(String(record.customer_email || "").trim()));
    state.ownerEvents = eventsResult.data || [];
    state.ownerOrders = ordersResult.data || [];
    if (!state.ownerRecords.some((record) => record.id === state.ownerRecordId)) {
      state.ownerRecordId = state.ownerRecords.find((record) => record.record_type !== "quote")?.id || state.ownerRecords[0]?.id || "";
    }
  }
  renderOwnerTools();
}

function renderOwnerTools() {
  if (!state.ownerRoot) return;
  const record = ownerSelectedRecord();
  const recordEvents = record ? state.ownerEvents.filter((event) => event.record_id === record.id) : [];
  const recordOrders = record ? state.ownerOrders.filter((order) => order.record_id === record.id) : [];
  const customerItems = [
    ...recordEvents.filter((event) => event.event_type === "customer_photo" || (event.event_type === "note" && event.created_by !== state.session?.user?.id)),
    ...recordOrders.filter((order) => order.requested_by_role === "customer"),
  ].sort((a, b) => new Date(b.event_date || b.created_at || 0) - new Date(a.event_date || a.created_at || 0));
  state.ownerRoot.innerHTML = `
    <button class="jbs-owner-launcher" data-owner-action="toggle" aria-expanded="${state.ownerOpen}" aria-label="${state.ownerOpen ? "Close" : "Open"} Customer Upgrade Center" title="Customer Upgrade Center">
      <span aria-hidden="true">◆</span><b>Customer Upgrade Center</b>
      ${customerItems.length ? `<i>${customerItems.length}</i>` : ""}
    </button>
    ${state.ownerOpen ? `
      <div class="jbs-owner-backdrop" data-owner-action="backdrop">
        <aside class="jbs-owner-drawer" role="dialog" aria-modal="true" aria-label="Customer Upgrade Center">
          <header>
            <div><small>OWNER TOOLS · VERSION ${APP_VERSION}</small><h2>Customer Upgrade Center</h2></div>
            <button data-owner-action="close" aria-label="Close">×</button>
          </header>
          <div class="jbs-owner-body">
            <div class="jbs-owner-planning"><button data-owner-action="preview-guest">Preview Customer Side</button><button data-owner-action="preview-builder">Live Deck Builder</button><button data-owner-action="preview-paint">Photo Paint Visualizer</button><small>Try the customer tools and return here without signing out.</small></div>
            ${state.ownerLoading ? `<div class="jbs-owner-loading"><div class="jbs-spinner"></div><p>Loading customer projects…</p></div>` : ""}
            ${state.ownerDraft.error ? `<div class="jbs-owner-alert">${escapeHtml(state.ownerDraft.error)} <button data-owner-action="refresh">Try again</button></div>` : ""}
            ${!state.ownerLoading && !state.ownerRecords.length ? `<div class="jbs-owner-empty"><h3>No customer records yet</h3><p>Add a customer record in the main owner dashboard, then manage its timeline here.</p></div>` : ""}
            ${record ? renderOwnerRecord(record, recordEvents, recordOrders, customerItems) : ""}
          </div>
        </aside>
      </div>
    ` : ""}
  `;
}

function renderOwnerRecord(record, events, orders, customerItems) {
  const stage = state.ownerDraft.stage ?? record.current_stage ?? statusToStage(record.status);
  return `
    <label class="jbs-owner-project-picker">Customer project
      <select data-owner-field="recordId">
        ${state.ownerRecords.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === record.id ? "selected" : ""}>${escapeHtml(item.customer_name || item.customer_email || "Customer")} — ${escapeHtml(item.title || "Untitled")}</option>`).join("")}
      </select>
    </label>
    <section class="jbs-owner-summary">
      <div><small>Customer</small><strong>${escapeHtml(record.customer_name || "Customer")}</strong><span>${escapeHtml(record.customer_email || "")}</span></div>
      <div><small>Current stage</small><strong>${escapeHtml(TIMELINE_STAGES.find((item) => item.id === stage)?.label || record.status || "Not set")}</strong><span>${escapeHtml(record.location || "Location not listed")}</span></div>
    </section>
    <section class="jbs-owner-section">
      <div class="jbs-owner-section-title"><div><small>PROJECT TIMELINE</small><h3>Move the project forward</h3></div><span>${events.length} updates</span></div>
      <div class="jbs-owner-stage-grid">
        ${TIMELINE_STAGES.map((item, index) => `<button class="${item.id === stage ? "active" : ""}" data-owner-action="choose-stage" data-stage="${item.id}"><b>${index + 1}</b><span>${escapeHtml(item.label)}</span></button>`).join("")}
      </div>
      <label>Update note<textarea data-owner-field="stageNote" placeholder="What changed?">${escapeHtml(state.ownerDraft.stageNote || "")}</textarea></label>
      <button class="jbs-owner-primary" data-owner-action="save-stage">Publish timeline stage</button>
    </section>
    <section class="jbs-owner-section">
      <div class="jbs-owner-section-title"><div><small>SCHEDULE</small><h3>Dates & customer notice</h3></div></div>
      <div class="jbs-owner-two-col">
        <label>Start<input type="datetime-local" data-owner-field="scheduledStart" value="${escapeHtml(state.ownerDraft.scheduledStart ?? localDateTime(record.scheduled_start))}"></label>
        <label>Finish<input type="datetime-local" data-owner-field="scheduledEnd" value="${escapeHtml(state.ownerDraft.scheduledEnd ?? localDateTime(record.scheduled_end))}"></label>
      </div>
      <label>Schedule message<textarea data-owner-field="scheduleNote" placeholder="Example: Staining moved to Wednesday because of rain.">${escapeHtml(state.ownerDraft.scheduleNote || "")}</textarea></label>
      <button class="jbs-owner-primary" data-owner-action="save-schedule">Save schedule & notify customer</button>
    </section>
    <section class="jbs-owner-section">
      <div class="jbs-owner-section-title"><div><small>PROGRESS</small><h3>Photo or quick update</h3></div></div>
      <label>Update title<input data-owner-field="progressTitle" maxlength="180" placeholder="Day 2 progress" value="${escapeHtml(state.ownerDraft.progressTitle || "")}"></label>
      <label>Details<textarea data-owner-field="progressNote" maxlength="1200" placeholder="Tell the customer what was completed.">${escapeHtml(state.ownerDraft.progressNote || "")}</textarea></label>
      <label class="jbs-owner-file">Progress photo<input type="file" accept="image/*" data-owner-file="progress"><span>${state.ownerDraft.progressPhoto ? "Photo ready to publish" : "Choose a photo"}</span></label>
      ${state.ownerDraft.progressPhoto ? `<img class="jbs-owner-photo-preview" src="${safeImageSource(state.ownerDraft.progressPhoto.data)}" alt="Progress preview">` : ""}
      <button class="jbs-owner-primary" data-owner-action="publish-progress">Publish progress update</button>
    </section>
    <section class="jbs-owner-section">
      <div class="jbs-owner-section-title"><div><small>CHANGE ORDERS</small><h3>Price a project change</h3></div><span>${orders.length}</span></div>
      <label>Title<input data-owner-field="orderTitle" maxlength="200" placeholder="Additional stair-board repair" value="${escapeHtml(state.ownerDraft.orderTitle || "")}"></label>
      <label>Description<textarea data-owner-field="orderDescription" maxlength="3000">${escapeHtml(state.ownerDraft.orderDescription || "")}</textarea></label>
      <label>Amount<input type="number" min="0" step="0.01" data-owner-field="orderAmount" placeholder="0.00" value="${escapeHtml(state.ownerDraft.orderAmount || "")}"></label>
      <button class="jbs-owner-primary" data-owner-action="create-order">Send priced change order</button>
      <div class="jbs-owner-order-list">
        ${orders.map(renderOwnerOrder).join("") || `<p class="jbs-muted">No change orders for this project.</p>`}
      </div>
    </section>
    <section class="jbs-owner-section">
      <div class="jbs-owner-section-title"><div><small>CUSTOMER INPUT</small><h3>Photos & requests</h3></div><span>${customerItems.length}</span></div>
      <div class="jbs-owner-customer-items">
        ${customerItems.map((item) => item.event_type ? `
          <article><b>${escapeHtml(item.title || "Customer update")}</b><p>${escapeHtml(item.description || "")}</p>${item.media?.[0] ? `<img src="${safeImageSource(item.media[0])}" alt="Customer project upload">` : ""}<small>${formatDate(item.event_date)}</small></article>
        ` : `
          <article><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.description || "")}</p><small>${escapeHtml(item.status || "requested")} · ${formatDate(item.created_at)}</small></article>
        `).join("") || `<p class="jbs-muted">No new customer uploads or requests.</p>`}
      </div>
    </section>
  `;
}

function renderOwnerOrder(order) {
  return `
    <article data-owner-order-card="${escapeHtml(order.id)}">
      <div><b>${escapeHtml(order.title)}</b><small>${escapeHtml(order.requested_by_role === "customer" ? "Customer request" : "Owner change order")}</small></div>
      <p>${escapeHtml(order.description || "")}</p>
      <div class="jbs-owner-order-controls">
        <input type="number" min="0" step="0.01" data-owner-order-amount value="${order.amount == null ? "" : Number(order.amount).toFixed(2)}" aria-label="Change order amount">
        <select data-owner-order-status aria-label="Change order status">
          ${["requested", "priced", "approved", "declined", "completed"].map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status.replaceAll("_", " ")}</option>`).join("")}
        </select>
        <button data-owner-action="update-order" data-id="${escapeHtml(order.id)}">Save</button>
      </div>
    </article>
  `;
}

function handleOwnerInput(event) {
  const field = event.target.dataset.ownerField;
  if (field) state.ownerDraft[field] = event.target.value;
}

async function handleOwnerChange(event) {
  if (event.target.dataset.ownerField === "recordId") {
    state.ownerRecordId = event.target.value;
    state.ownerDraft = {};
    renderOwnerTools();
    return;
  }
  if (event.target.dataset.ownerFile === "progress" && event.target.files?.[0]) {
    state.ownerDraft.progressPhoto = await resizeImage(event.target.files[0]);
    renderOwnerTools();
  }
}

async function handleOwnerClick(event) {
  const target = event.target.closest("[data-owner-action]");
  if (!target) return;
  const action = target.dataset.ownerAction;
  if (action === "backdrop" && event.target !== target) return;
  event.preventDefault();
  try {
    if (action === "toggle") state.ownerOpen = !state.ownerOpen;
    else if (action === "close" || action === "backdrop") state.ownerOpen = false;
    else if (action === "preview-guest") { startDemo(); return; }
    else if (action === "preview-builder") { startDemo(); openBuilder(); return; }
    else if (action === "preview-paint") { startDemo(); openPaint(); return; }
    else if (action === "refresh") return loadOwnerData();
    else if (action === "choose-stage") state.ownerDraft.stage = target.dataset.stage;
    else if (action === "save-stage") return saveOwnerStage(target);
    else if (action === "save-schedule") return saveOwnerSchedule(target);
    else if (action === "publish-progress") return publishOwnerProgress(target);
    else if (action === "create-order") return createOwnerOrder(target);
    else if (action === "update-order") return updateOwnerOrder(target.dataset.id, target);
    renderOwnerTools();
  } catch (error) {
    console.error("[JBs owner upgrade]", error);
    state.ownerDraft.error = error?.message || "That owner update could not be saved.";
    renderOwnerTools();
  }
}

function ownerEvent(record, values) {
  return {
    record_id: record.id,
    customer_user_id: null,
    customer_email: String(record.customer_email || "").toLowerCase(),
    event_date: new Date().toISOString(),
    created_by: state.session.user.id,
    created_by_name: displayName(),
    ...values,
  };
}

async function saveOwnerStage(button) {
  const record = ownerSelectedRecord();
  const stage = state.ownerDraft.stage ?? record?.current_stage ?? statusToStage(record?.status);
  if (!record || !stage) throw new Error("Choose a project and timeline stage first.");
  const label = TIMELINE_STAGES.find((item) => item.id === stage)?.label || stage;
  setBusy(button, true, "Publishing…");
  const { error: updateError } = await client().from("customer_records").update({ current_stage: stage, status: label, updated_at: new Date().toISOString() }).eq("id", record.id);
  if (updateError) throw updateError;
  const { data, error } = await client().from("project_events").insert(ownerEvent(record, {
    event_type: "stage",
    stage,
    title: label,
    description: clampText(state.ownerDraft.stageNote, 1200) || `Project moved to ${label}.`,
  })).select("id").single();
  if (error) throw error;
  await sendPush("project_update", { eventId: data.id });
  state.ownerDraft.stageNote = "";
  await loadOwnerData();
}

async function saveOwnerSchedule(button) {
  const record = ownerSelectedRecord();
  if (!record) throw new Error("Choose a customer project first.");
  const start = state.ownerDraft.scheduledStart ? new Date(state.ownerDraft.scheduledStart).toISOString() : null;
  const end = state.ownerDraft.scheduledEnd ? new Date(state.ownerDraft.scheduledEnd).toISOString() : null;
  if (start && end && new Date(end) < new Date(start)) throw new Error("The finish date must be after the start date.");
  setBusy(button, true, "Saving…");
  const { error: updateError } = await client().from("customer_records").update({ scheduled_start: start, scheduled_end: end, updated_at: new Date().toISOString() }).eq("id", record.id);
  if (updateError) throw updateError;
  const description = clampText(state.ownerDraft.scheduleNote, 1200) || `Schedule updated${start ? `: ${formatDate(start)}` : ""}${end ? ` through ${formatDate(end)}` : ""}.`;
  const { data, error } = await client().from("project_events").insert(ownerEvent(record, { event_type: "schedule", title: "Schedule update", description })).select("id").single();
  if (error) throw error;
  await sendPush("project_update", { eventId: data.id });
  state.ownerDraft.scheduleNote = "";
  await loadOwnerData();
}

async function publishOwnerProgress(button) {
  const record = ownerSelectedRecord();
  const title = clampText(state.ownerDraft.progressTitle, 180);
  const note = clampText(state.ownerDraft.progressNote, 1200);
  if (!record || (!title && !note && !state.ownerDraft.progressPhoto)) throw new Error("Add a title, note, or progress photo first.");
  setBusy(button, true, "Publishing…");
  const { data, error } = await client().from("project_events").insert(ownerEvent(record, {
    event_type: state.ownerDraft.progressPhoto ? "progress_photo" : "note",
    title: title || "Project progress",
    description: note || "A new progress photo was added.",
    media: state.ownerDraft.progressPhoto ? [state.ownerDraft.progressPhoto.data] : [],
  })).select("id").single();
  if (error) throw error;
  await sendPush("project_update", { eventId: data.id });
  state.ownerDraft.progressTitle = "";
  state.ownerDraft.progressNote = "";
  state.ownerDraft.progressPhoto = null;
  await loadOwnerData();
}

async function createOwnerOrder(button) {
  const record = ownerSelectedRecord();
  const title = clampText(state.ownerDraft.orderTitle, 200);
  const description = clampText(state.ownerDraft.orderDescription, 3000);
  const amount = Number(state.ownerDraft.orderAmount);
  if (!record || !title || !description || !Number.isFinite(amount) || amount < 0) throw new Error("Add a title, description, and valid amount.");
  setBusy(button, true, "Sending…");
  const { data, error } = await client().from("change_orders").insert({
    record_id: record.id,
    customer_user_id: null,
    customer_email: String(record.customer_email || "").toLowerCase(),
    title,
    description,
    amount,
    status: "priced",
    requested_by_role: "owner",
    created_by: state.session.user.id,
  }).select("id").single();
  if (error) throw error;
  await sendPush("change_order", { changeOrderId: data.id });
  state.ownerDraft.orderTitle = "";
  state.ownerDraft.orderDescription = "";
  state.ownerDraft.orderAmount = "";
  await loadOwnerData();
}

async function updateOwnerOrder(id, button) {
  const card = button.closest("[data-owner-order-card]");
  const amountText = card?.querySelector("[data-owner-order-amount]")?.value;
  const amount = amountText === "" ? null : Number(amountText);
  const status = card?.querySelector("[data-owner-order-status]")?.value;
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new Error("Enter a valid non-negative amount.");
  setBusy(button, true, "Saving…");
  const { error } = await client().from("change_orders").update({ amount, status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await sendPush("change_order", { changeOrderId: id });
  await loadOwnerData();
}

function bindRoot() {
  if (!state.root || state.root.dataset.bound === "true") return;
  state.root.dataset.bound = "true";
  state.root.addEventListener("click", handleClick);
  state.root.addEventListener("input", handleInput);
  state.root.addEventListener("change", handleChange);
}

function render() {
  if (!state.root) return;
  const selected = state.recordId ? state.records.find((record) => record.id === state.recordId) : null;
  const content = selected ? renderRecordDetail(selected) : state.modal ? renderCurrentView() : renderCurrentView();
  state.root.innerHTML = `
    <div class="jbs-customer-app ${state.demo ? "is-demo" : ""}">
      ${renderHeader(selected)}
      <main class="jbs-app-content" id="jbs-main-content">${content}</main>
      ${selected ? "" : renderBottomNav()}
      ${renderModal()}
      ${state.toast ? `<div class="jbs-toast" role="status">${escapeHtml(state.toast)}</div>` : ""}
    </div>
  `;
  if (state.modal?.type === "paint") mountPaint(state.root.querySelector('.jbs-modal-body'),state.paintDraft,{save:(d,preview,b)=>persistPaint(d,preview,false,b),quote:(d,preview,b)=>persistPaint(d,preview,true,b)});
  if (state.modal?.type === "quoteSign") window.setTimeout(setupSignatureCanvas, 0);
  if (state.view === "messages" && !state.modal) {
    window.setTimeout(() => {
      const thread = state.root?.querySelector(".jbs-thread");
      if (thread) thread.scrollTop = thread.scrollHeight;
      markMessagesRead();
    }, 0);
  }
}

function renderHeader(selected) {
  return `
    <header class="jbs-app-header">
      <div class="jbs-brand">
        <img src="/icon.svg" alt="" width="42" height="42">
        <div>
          <small>JB’S UNIVERSAL RENOVATIONS</small>
          <strong>${selected ? escapeHtml(selected.title) : pageTitle()}</strong>
          <span>Built Tough. Fixed Right. Made to Last.</span>
        </div>
      </div>
      <div class="jbs-header-actions">
        ${state.demo ? '<button class="jbs-outline" data-action="sign-out">' + (state.previewOwnerSession ? 'Back to Owner' : 'Exit Demo') + '</button><span class="jbs-demo-pill">DEMO</span>' : ""}
        ${selected ? '<button class="jbs-icon-button" data-action="back-record" aria-label="Go back">‹</button>' : '<button class="jbs-icon-button" data-action="open-notifications" aria-label="Notifications">♢</button>'}
      </div>
    </header>
  `;
}

function pageTitle() {
  return {
    home: "My Project Hub",
    projects: "Projects & Quotes",
    messages: "Messages",
    explore: "Ideas & Gallery",
    more: "Project Tools",
  }[state.view] || "Customer Portal";
}

function renderBottomNav() {
  const unread = unreadCount();
  return `
    <nav class="jbs-bottom-nav" aria-label="Customer navigation">
      ${NAV_ITEMS.map(([id, icon, label]) => `
        <button class="${state.view === id ? "active" : ""}" data-action="nav" data-view="${id}">
          <span aria-hidden="true">${icon}</span>
          <small>${label}</small>
          ${id === "messages" && unread ? `<b class="jbs-nav-badge">${unread > 99 ? "99+" : unread}</b>` : ""}
        </button>
      `).join("")}
    </nav>
  `;
}

function renderCurrentView() {
  if (state.loading) return renderLoading();
  if (state.error) return `<section class="jbs-panel jbs-error"><h2>Couldn’t refresh</h2><p>${escapeHtml(state.error)}</p><button class="jbs-primary" data-action="refresh">Try again</button></section>`;
  if (state.view === "projects") return renderProjects();
  if (state.view === "messages") return renderMessages();
  if (state.view === "explore") return renderExplore();
  if (state.view === "more") return renderMore();
  return renderHome();
}

function renderLoading() {
  return `<section class="jbs-panel jbs-loading"><div class="jbs-spinner"></div><h2>Loading your projects…</h2><p>Your private customer information is being refreshed.</p></section>`;
}

function renderHome() {
  const projects = state.records.filter((record) => record.record_type !== "quote");
  const quotes = state.records.filter((record) => record.record_type === "quote");
  const active = projects.find((record) => (record.current_stage || statusToStage(record.status)) !== "completed") || projects[0];
  const openQuotes = quotes.filter((quote) => responseFor(quote.id)?.response_status !== "accepted");
  const recent = [...state.events].sort((a, b) => String(b.event_date || b.created_at).localeCompare(String(a.event_date || a.created_at))).slice(0, 4);
  return `
    <section class="jbs-welcome-card">
      <div>
        <span class="jbs-eyebrow">WELCOME BACK</span>
        <h1>Hi, ${escapeHtml(displayName().split(" ")[0])}</h1>
        <p>Track your work, approve quotes, save ideas, and message Billy or Jeremiah.</p>
      </div>
      <button class="jbs-primary" data-action="open-quote-request">Request a Quote</button>
    </section>
    <section class="jbs-stat-grid">
      <button data-action="nav" data-view="projects"><strong>${projects.length}</strong><span>Projects</span></button>
      <button data-action="show-quotes"><strong>${openQuotes.length}</strong><span>Quotes to review</span></button>
      <button data-action="nav" data-view="messages"><strong>${unreadCount()}</strong><span>Unread messages</span></button>
    </section>
    ${active ? renderTimelinePreview(active) : renderNoProjects()}
    <section class="jbs-section">
      <div class="jbs-section-title"><div><span class="jbs-eyebrow">QUICK START</span><h2>Plan your next project</h2></div></div>
      <div class="jbs-action-grid">
        <button data-action="open-builder"><span>▦</span><b>Deck Builder</b><small>Design, preview & plan</small></button>
        <button data-action="open-estimator"><span>≈</span><b>Rough Cost</b><small>Get a planning range</small></button>
        <button data-action="open-plan"><span>＋</span><b>Save a Plan</b><small>Ideas, budget & notes</small></button>
        <button data-action="open-paint"><span>◐</span><b>Paint Preview</b><small>Colors on your photo</small></button>
        <button data-action="nav" data-view="explore"><span>◈</span><b>Browse Ideas</b><small>Materials & inspiration</small></button>
      </div>
    </section>
    ${recent.length ? `
      <section class="jbs-panel">
        <div class="jbs-section-title"><div><span class="jbs-eyebrow">RECENT ACTIVITY</span><h2>Project updates</h2></div></div>
        <div class="jbs-activity-list">${recent.map(renderActivity).join("")}</div>
      </section>
    ` : ""}
  `;
}

function renderNoProjects() {
  return `
    <section class="jbs-panel jbs-empty">
      <span class="jbs-empty-icon">⌂</span>
      <h2>Ready to start something?</h2>
      <p>Send a guided quote request with measurements and photos. We’ll review it and message you.</p>
      <button class="jbs-primary" data-action="open-quote-request">Start Quote Request</button>
    </section>
  `;
}

function renderTimelinePreview(record) {
  const current = record.current_stage || statusToStage(record.status);
  const model = buildTimeline(current, eventsFor(record.id));
  const index = Math.max(0, model.findIndex((stage) => stage.state === "current"));
  const next = model[index + 1];
  const progress = Math.round(((index + 1) / model.length) * 100);
  return `
    <section class="jbs-panel jbs-feature-project">
      <div class="jbs-section-title">
        <div><span class="jbs-eyebrow">ACTIVE PROJECT</span><h2>${escapeHtml(record.title)}</h2><p>${escapeHtml(record.location || "")}</p></div>
        <button class="jbs-link-button" data-action="open-record" data-id="${escapeHtml(record.id)}">View ›</button>
      </div>
      <div class="jbs-stage-summary">
        <div class="jbs-stage-ring" style="--progress: ${progress * 3.6}deg"><strong>${progress}%</strong></div>
        <div><small>CURRENT STAGE</small><h3>${escapeHtml(model[index]?.label || "Estimate Requested")}</h3><p>${next ? `Next: ${escapeHtml(next.label)}` : "Project complete"}</p></div>
      </div>
      <div class="jbs-mini-timeline">${model.map((stage) => `<span class="${stage.state}" title="${escapeHtml(stage.label)}"></span>`).join("")}</div>
    </section>
  `;
}

function renderActivity(event) {
  const icon = event.event_type === "schedule" ? "◷" : event.event_type.includes("photo") ? "▧" : event.event_type === "stage" ? "✓" : "•";
  return `
    <article>
      <span class="jbs-activity-icon">${icon}</span>
      <div><b>${escapeHtml(event.title || "Project update")}</b><p>${escapeHtml(event.description || "")}</p><small>${formatDate(event.event_date || event.created_at, { time: true })}${event.created_by_name ? ` · ${escapeHtml(event.created_by_name)}` : ""}</small></div>
    </article>
  `;
}

function renderProjects() {
  const quotes = state.records.filter((record) => record.record_type === "quote");
  const projects = state.records.filter((record) => record.record_type !== "quote");
  return `
    <section class="jbs-section">
      <div class="jbs-section-title"><div><span class="jbs-eyebrow">PRIVATE TO YOUR ACCOUNT</span><h1>Projects & Quotes</h1></div><button class="jbs-primary small" data-action="open-quote-request">+ Quote</button></div>
      <div class="jbs-segmented">
        <button class="active" data-action="scroll-section" data-target="project-list">Projects <b>${projects.length}</b></button>
        <button data-action="scroll-section" data-target="quote-list">Quotes <b>${quotes.length}</b></button>
        <button data-action="scroll-section" data-target="plan-list">Plans <b>${state.plans.length}</b></button>
      </div>
    </section>
    <section class="jbs-panel" id="project-list">
      <div class="jbs-section-title"><h2>My Projects</h2></div>
      ${projects.length ? projects.map(renderRecordCard).join("") : '<p class="jbs-muted">No active projects are assigned yet.</p>'}
    </section>
    <section class="jbs-panel" id="quote-list">
      <div class="jbs-section-title"><h2>My Quotes</h2></div>
      ${quotes.length ? quotes.map(renderRecordCard).join("") : '<p class="jbs-muted">No quotes are waiting for review.</p>'}
    </section>
    <section class="jbs-panel" id="plan-list">
      <div class="jbs-section-title"><h2>Saved Project Plans</h2><button class="jbs-link-button" data-action="open-plan">+ New plan</button></div>
      ${state.plans.length ? state.plans.map(renderPlanCard).join("") : '<p class="jbs-muted">Save ideas, measurements, colors, budget, and timing in one place.</p>'}
    </section>
    <section class="jbs-panel">
      <div class="jbs-section-title"><h2>Quote Requests</h2></div>
      ${state.requests.length ? state.requests.map((request) => `<article class="jbs-request-row"><div><b>${escapeHtml(request.project_type)}</b><small>Sent ${formatDate(request.created_at)}</small></div><span class="jbs-status">${escapeHtml(request.status)}</span></article>`).join("") : '<p class="jbs-muted">No quote requests submitted yet.</p>'}
    </section>
  `;
}

function renderRecordCard(record) {
  const isQuote = record.record_type === "quote";
  const response = isQuote ? responseFor(record.id) : null;
  const stage = TIMELINE_STAGES.find((item) => item.id === (record.current_stage || statusToStage(record.status)));
  const status = response?.response_status === "accepted" ? "Signed & Accepted" : response?.response_status === "changes_requested" ? "Changes Requested" : isQuote ? record.status || "Quote Ready" : stage?.label || record.status;
  return `
    <button class="jbs-record-card" data-action="open-record" data-id="${escapeHtml(record.id)}">
      <span class="jbs-record-icon">${isQuote ? "$" : "⌂"}</span>
      <span class="jbs-record-copy"><b>${escapeHtml(record.title)}</b><small>${escapeHtml(record.location || record.record_date || "")}</small><em>${escapeHtml(status || "")}</em></span>
      <span class="jbs-record-value">${isQuote ? formatMoney(record.amount) : "View ›"}</span>
    </button>
  `;
}

function builderConfigFor(plan) {
  const config = plan?.analyzer_result;
  return config?.tool === "deck_builder" && config?.input ? config : null;
}

function renderPlanCard(plan) {
  const builder = builderConfigFor(plan);
  const paint = plan.analyzer_result?.tool === "paint_visualizer";
  return `
    <button class="jbs-record-card" data-action="${builder ? "edit-builder" : paint ? "edit-paint" : "edit-plan"}" data-id="${escapeHtml(plan.id)}">
      <span class="jbs-record-icon">${builder ? "▦" : "✎"}</span>
      <span class="jbs-record-copy"><b>${escapeHtml(plan.title)}</b><small>${escapeHtml(plan.project_type || "Project plan")} · ${escapeHtml(plan.timeframe || "Timing not set")}</small><em>${escapeHtml(plan.status || "Draft")}</em></span>
      <span class="jbs-record-value">${builder ? "Open Builder" : paint ? "Open Paint Preview" : "Edit"} ›</span>
    </button>
  `;
}

function renderMessages() {
  return `
    <section class="jbs-message-shell">
      <div class="jbs-message-heading">
        <div><span class="jbs-eyebrow">DIRECT WITH THE OWNERS</span><h1>Billy & Jeremiah</h1><p>Messages, quote questions, and project updates</p></div>
        <span class="jbs-online-dot">Active</span>
      </div>
      <div class="jbs-thread" aria-live="polite">
        ${state.messages.length ? state.messages.map(renderMessage).join("") : '<div class="jbs-empty-chat"><span>✉</span><h2>Start a conversation</h2><p>Send us a question about your quote or project.</p></div>'}
      </div>
      <form class="jbs-message-composer" data-form="message">
        <textarea name="message" maxlength="4000" placeholder="Type a message…" aria-label="Message"></textarea>
        <button class="jbs-primary" type="submit" data-action="send-message">Send</button>
      </form>
    </section>
  `;
}

function renderMessage(message) {
  const mine = message.sender_role === "customer";
  const read = mine ? state.reads.filter((item) => item.message_id === message.id && item.reader_role === "owner") : [];
  return `
    <article class="jbs-message ${mine ? "mine" : "theirs"}">
      ${!mine ? `<span class="jbs-avatar">${escapeHtml((message.sender_name || "JB").slice(0, 1).toUpperCase())}</span>` : ""}
      <div>
        <small class="jbs-sender">${mine ? "You" : escapeHtml(message.sender_name || "JB’s Universal Renovations")}</small>
        <p>${escapeHtml(message.message)}</p>
        <time>${formatDate(message.created_at, { time: true, year: false })}</time>
        ${mine ? `<em>${read.length ? `Seen by ${escapeHtml([...new Set(read.map((item) => item.reader_name))].join(", "))}` : "Delivered"}</em>` : ""}
      </div>
    </article>
  `;
}

function renderExplore() {
  const search = String(state.exploreSearch || "").toLowerCase();
  const items = IDEAS.filter((idea) => [idea.title, idea.category, idea.text].join(" ").toLowerCase().includes(search));
  return `
    <section class="jbs-explore-hero">
      <span class="jbs-eyebrow">PROJECT INSPIRATION</span>
      <h1>Find a direction you like</h1>
      <p>Browse project ideas, then save favorites to your private plan.</p>
      <label class="jbs-search"><span>⌕</span><input data-field="exploreSearch" value="${escapeHtml(state.exploreSearch || "")}" placeholder="Search decks, roofing, trailers…"></label>
    </section>
    <section class="jbs-panel jbs-explore-builders"><h2>See your project take shape</h2><button class="jbs-primary" data-action="open-builder">Build a Deck</button><button class="jbs-outline" data-action="open-paint">Try Paint Colors</button></section>
    <section class="jbs-gallery-grid">
      ${items.map((idea, index) => `
        <article class="jbs-idea-card tone-${(index % 4) + 1}">
          <div class="jbs-idea-art"><span>${idea.icon}</span><small>${escapeHtml(idea.category)}</small></div>
          <div><h2>${escapeHtml(idea.title)}</h2><p>${escapeHtml(idea.text)}</p><button data-action="save-idea" data-id="${idea.id}">${state.workspace.saved_ideas?.includes(idea.id) ? "✓ Saved" : "+ Save idea"}</button></div>
        </article>
      `).join("") || '<section class="jbs-panel jbs-empty"><h2>No matching ideas</h2><p>Try a different project type.</p></section>'}
    </section>
    <section class="jbs-panel jbs-gallery-note">
      <h2>Want a real project example?</h2>
      <p>Your quote and project screens can include before photos, proposed previews, and progress photos without exposing another customer’s private information.</p>
      <button class="jbs-primary" data-action="open-quote-request">Plan My Project</button>
    </section>
  `;
}

function renderMore() {
  return `
    <section class="jbs-section">
      <span class="jbs-eyebrow">PLANNING CENTER</span><h1>Project Tools</h1>
      <p class="jbs-lead">Everything you need before, during, and after your project.</p>
      <div class="jbs-tool-list">
        ${toolButton("▦", "Deck & Project Builder", "Lay out a deck, preview it, and create a planning materials list.", "open-builder")}
        ${toolButton("≈", "Rough Cost Estimator", "Build a planning range—not a final quote.", "open-estimator")}
        ${toolButton("✎", "Saved Project Plans", "Keep ideas, notes, measurements, budget, and timing.", "open-plan")}
        ${toolButton("◐", "Photo Paint Visualizer", "Try wall, trim, or exterior colors on your own photo.", "open-paint")}
        ${toolButton("▧", "Photo Project Check", "Check whether your photos show enough detail.", "open-analyzer")}
        ${toolButton("↔", "Saved Measurements", "Store room, deck, roof, gutter, or trailer measurements.", "open-measurements")}
        ${toolButton("◐", "Materials & Colors", "Compare palettes and save favorites.", "open-materials")}
        ${toolButton("✓", "Home Maintenance Center", "Use a seasonal checklist and save progress.", "open-maintenance")}
        ${toolButton("⇩", isInstalled() ? "App Installed" : "Install This App", isInstalled() ? `Version ${APP_VERSION} is installed.` : "Add the app to your home screen.", "open-install")}
        ${toolButton("♢", "Push Notifications", "Get alerts for messages, quotes, and project changes.", "enable-notifications")}
      </div>
    </section>
    <section class="jbs-panel jbs-account-card">
      <div><span class="jbs-avatar large">${escapeHtml(displayName().slice(0, 1).toUpperCase())}</span><div><b>${escapeHtml(displayName())}</b><small>${escapeHtml(currentEmail())}</small><em>App version ${APP_VERSION}</em></div></div>
      <button class="jbs-outline" data-action="sign-out">${state.demo ? "Exit Demo" : "Sign out"}</button>
    </section>
  `;
}

function toolButton(icon, title, text, action) {
  return `<button data-action="${action}"><span>${icon}</span><div><b>${title}</b><small>${text}</small></div><em>›</em></button>`;
}

function renderRecordDetail(record) {
  return record.record_type === "quote" ? renderQuoteDetail(record) : renderProjectDetail(record);
}

function renderProjectDetail(record) {
  const recordEvents = eventsFor(record.id);
  const current = record.current_stage || statusToStage(record.status);
  const timeline = buildTimeline(current, recordEvents);
  const progress = recordEvents.filter((event) => ["progress_photo", "customer_photo"].includes(event.event_type));
  const schedule = recordEvents.filter((event) => event.event_type === "schedule");
  const notes = recordEvents.filter((event) => !["stage", "schedule", "progress_photo", "customer_photo"].includes(event.event_type));
  const orders = ordersFor(record.id);
  const images = [...(record.before_images || []), ...(record.proposed_after_images || [])];
  return `
    <section class="jbs-detail-hero">
      <span class="jbs-eyebrow">${escapeHtml(record.record_type || "PROJECT")}</span>
      <h1>${escapeHtml(record.title)}</h1>
      <p>${escapeHtml(record.location || "Location available in your project details")}</p>
      <div class="jbs-detail-chips"><span>${escapeHtml(TIMELINE_STAGES.find((stage) => stage.id === current)?.label || record.status || "Planning")}</span>${record.record_date ? `<span>${escapeHtml(record.record_date)}</span>` : ""}</div>
    </section>
    <section class="jbs-panel">
      <div class="jbs-section-title"><div><span class="jbs-eyebrow">LIVE PROJECT TIMELINE</span><h2>What’s happening now</h2></div></div>
      <div class="jbs-full-timeline">
        ${timeline.map((stage) => {
          const event = [...recordEvents].reverse().find((item) => item.event_type === "stage" && item.stage === stage.id);
          return `
            <article class="${stage.state}">
              <span class="jbs-stage-marker">${stage.state === "complete" ? "✓" : stage.state === "current" ? "●" : ""}</span>
              <div><b>${escapeHtml(stage.label)}</b>${stage.date ? `<small>${formatDate(stage.date, { time: true })}</small>` : ""}${event?.description ? `<p>${escapeHtml(event.description)}</p>` : ""}</div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
    ${schedule.length ? `
      <section class="jbs-panel">
        <div class="jbs-section-title"><div><span class="jbs-eyebrow">SCHEDULE CHANGES</span><h2>Timing updates</h2></div></div>
        <div class="jbs-update-list">${schedule.map(renderUpdateCard).join("")}</div>
      </section>
    ` : ""}
    <section class="jbs-panel">
      <div class="jbs-section-title"><div><span class="jbs-eyebrow">PROGRESS PHOTOS</span><h2>See the work</h2></div><button class="jbs-link-button" data-action="open-project-photo" data-id="${escapeHtml(record.id)}">+ Add Photo</button></div>
      ${progress.length ? `<div class="jbs-photo-grid">${progress.flatMap((event) => (event.media || []).map((source, index) => renderPhoto(source, event.title || "Project progress", `${event.id}-${index}`))).join("")}</div>` : '<p class="jbs-muted">Progress photos will appear here as the work moves forward.</p>'}
    </section>
    <section class="jbs-panel">
      <div class="jbs-section-title"><div><span class="jbs-eyebrow">CHANGE ORDERS</span><h2>Adjustments & approvals</h2></div><button class="jbs-link-button" data-action="open-change-order" data-id="${escapeHtml(record.id)}">Request change</button></div>
      ${orders.length ? orders.map(renderChangeOrder).join("") : '<p class="jbs-muted">No changes or price adjustments have been added.</p>'}
    </section>
    ${notes.length ? `<section class="jbs-panel"><div class="jbs-section-title"><h2>Project Notes</h2></div><div class="jbs-update-list">${notes.map(renderUpdateCard).join("")}</div></section>` : ""}
    ${images.length ? `<section class="jbs-panel"><div class="jbs-section-title"><h2>Project Photos & Previews</h2></div><div class="jbs-photo-grid">${images.map((source, index) => renderPhoto(source, "Project image", `record-${index}`)).join("")}</div></section>` : ""}
  `;
}

function renderUpdateCard(event) {
  return `
    <article>
      <span>${event.event_type === "schedule" ? "◷" : event.event_type.includes("photo") ? "▧" : "•"}</span>
      <div><b>${escapeHtml(event.title || "Project update")}</b><p>${escapeHtml(event.description || "")}</p><small>${formatDate(event.event_date || event.created_at, { time: true })}${event.created_by_name ? ` · ${escapeHtml(event.created_by_name)}` : ""}</small></div>
    </article>
  `;
}

function renderPhoto(source, alt, key) {
  const safe = safeImageSource(source);
  if (!safe) return "";
  return `<button class="jbs-photo" data-action="view-photo" data-source="${escapeHtml(safe)}" data-alt="${escapeHtml(alt)}" data-key="${escapeHtml(key)}"><img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}" loading="lazy"></button>`;
}

function renderChangeOrder(order) {
  const response = state.changeOrderResponses.find((item) => item.change_order_id === order.id);
  const status = response?.response_status || order.status || "requested";
  const canRespond = order.status === "priced" && !response;
  return `
    <article class="jbs-change-order">
      <div class="jbs-change-top"><div><b>${escapeHtml(order.title)}</b><small>${formatDate(order.created_at)}</small></div><span class="jbs-status status-${escapeHtml(status)}">${escapeHtml(status.replaceAll("_", " "))}</span></div>
      <p>${escapeHtml(order.description || "")}</p>
      ${order.amount != null ? `<strong class="jbs-change-price">${formatMoney(order.amount)}</strong>` : '<em>Waiting for JB’s to price this request.</em>'}
      ${canRespond ? `<div class="jbs-change-actions"><button class="jbs-outline" data-action="respond-change-order" data-id="${order.id}" data-response="declined">Decline</button><button class="jbs-primary" data-action="respond-change-order" data-id="${order.id}" data-response="approved">Approve ${formatMoney(order.amount)}</button></div>` : ""}
      ${response?.customer_response_note ? `<p class="jbs-response-note">Your note: ${escapeHtml(response.customer_response_note)}</p>` : ""}
    </article>
  `;
}

function renderQuoteDetail(record) {
  const lineItems = Array.isArray(record.line_items) && record.line_items.length
    ? record.line_items
    : [{ id: "base", label: record.title, amount: Number(record.amount || 0), optional: false }];
  const response = responseFor(record.id);
  const photos = [...(record.before_images || []), ...(record.proposed_after_images || [])];
  return `
    <section class="jbs-detail-hero quote">
      <span class="jbs-eyebrow">PRIVATE QUOTE</span>
      <h1>${escapeHtml(record.title)}</h1>
      <p>${escapeHtml(record.location || record.record_date || "")}</p>
      <strong>${formatMoney(record.amount)}</strong>
    </section>
    ${response ? renderQuoteResponse(response) : ""}
    <section class="jbs-panel">
      <div class="jbs-section-title"><div><span class="jbs-eyebrow">PRICED WORK</span><h2>Items & Options</h2></div></div>
      <div class="jbs-line-items">
        ${lineItems.map((item) => `<article><div><b>${escapeHtml(item.label || item.description || "Quoted work")}</b><small>${item.optional ? "Optional" : "Included"}</small></div><strong>${formatMoney(item.amount)}</strong></article>`).join("")}
      </div>
      <div class="jbs-quote-total"><span>Quote total</span><strong>${formatMoney(record.amount)}</strong></div>
    </section>
    ${photos.length ? `<section class="jbs-panel"><div class="jbs-section-title"><h2>Photos & Proposed Views</h2></div><div class="jbs-photo-grid">${photos.map((source, index) => renderPhoto(source, "Quote project image", `quote-${index}`)).join("")}</div><p class="jbs-legal-note">Proposed images are visual concepts; final appearance may vary.</p></section>` : ""}
    ${Array.isArray(record.documents) && record.documents.length ? `<section class="jbs-panel"><div class="jbs-section-title"><h2>Original Documents</h2></div><div class="jbs-document-list">${record.documents.map((doc, index) => renderDocument(doc, index)).join("")}</div></section>` : ""}
    ${response?.response_status === "accepted" ? "" : `
      <section class="jbs-panel jbs-approval-actions">
        <span class="jbs-eyebrow">REVIEW & RESPOND</span>
        <h2>Ready to move forward?</h2>
        <p>You can request an adjustment or select optional items and sign securely.</p>
        <div><button class="jbs-outline" data-action="request-quote-change" data-id="${escapeHtml(record.id)}">Request Changes</button><button class="jbs-primary" data-action="open-quote-sign" data-id="${escapeHtml(record.id)}">Accept & Sign</button></div>
      </section>
    `}
  `;
}

function renderDocument(doc, index) {
  const source = typeof doc === "string" ? doc : doc?.src || doc?.url || "";
  const name = typeof doc === "string" ? `Document ${index + 1}` : doc?.name || `Document ${index + 1}`;
  if (!source) return "";
  return `<a href="${escapeHtml(source)}" target="_blank" rel="noopener"><span>▤</span><b>${escapeHtml(name)}</b><em>Open ›</em></a>`;
}

function renderQuoteResponse(response) {
  if (response.response_status === "accepted") {
    return `
      <section class="jbs-panel jbs-signed-box">
        <span class="jbs-signed-icon">✓</span>
        <div><span class="jbs-eyebrow">SIGNED & ACCEPTED</span><h2>${formatMoney(response.accepted_total)}</h2><p>Signed by ${escapeHtml(response.signer_name || "Customer")} on ${formatDate(response.signed_at, { time: true })}.</p><small>Audit ID: ${escapeHtml(response.audit_id || "Recorded")}</small></div>
      </section>
    `;
  }
  return `<section class="jbs-panel jbs-change-requested"><span>!</span><div><h2>Changes requested</h2><p>${escapeHtml(response.requested_changes || "Your request was sent to JB’s.")}</p></div></section>`;
}

function renderModal() {
  if (!state.modal) return "";
  const body = {
    quoteRequest: renderQuoteRequestModal,
    builder: renderBuilderModal,
    paint: () => paintMarkup(state.paintDraft),
    estimator: renderEstimatorModal,
    plan: renderPlanModal,
    analyzer: renderAnalyzerModal,
    measurements: renderMeasurementsModal,
    materials: renderMaterialsModal,
    maintenance: renderMaintenanceModal,
    install: renderInstallModal,
    notifications: renderNotificationModal,
    quoteChange: renderQuoteChangeModal,
    quoteSign: renderQuoteSignModal,
    projectPhoto: renderProjectPhotoModal,
    changeOrder: renderChangeOrderModal,
    photoViewer: renderPhotoViewer,
  }[state.modal.type];
  const modalClass = ["builder","paint"].includes(state.modal.type) ? "jbs-modal jbs-builder-modal" : "jbs-modal";
  return `<div class="jbs-modal-backdrop" role="presentation" data-action="close-modal-backdrop"><section class="${modalClass}" role="dialog" aria-modal="true" aria-label="${escapeHtml(state.modal.title || "Project tool")}"><header><button data-action="close-modal" aria-label="Close">×</button><div><span class="jbs-eyebrow">JB’S CUSTOMER PORTAL</span><h2>${escapeHtml(state.modal.title || "")}</h2></div></header><div class="jbs-modal-body">${body ? body() : ""}</div></section></div>`;
}

function renderQuoteRequestModal() {
  const draft = state.quoteDraft;
  const step = state.quoteStep;
  return `
    <div class="jbs-stepper">${[1, 2, 3, 4].map((number) => `<span class="${number < step ? "done" : number === step ? "current" : ""}">${number < step ? "✓" : number}</span>`).join("")}</div>
    <p class="jbs-step-label">Step ${step} of 4 · ${["Project", "Measurements", "Photos", "Review"][step - 1]}</p>
    ${step === 1 ? `
      <div class="jbs-form-grid">
        ${inputField("Your name", "quote.name", draft.name || displayName(), true)}
        ${inputField("Phone number", "quote.phone", draft.phone || "", true, "tel")}
        ${selectField("Project type", "quote.project_type", draft.project_type || "", ["", "Deck or Porch", "Roofing", "Gutters", "Painting", "Flooring", "Siding", "Trailer Repair", "General Repairs", "Other"])}
        ${inputField("Project city or address", "quote.location", draft.location || "", true)}
        ${selectField("Best way to contact you", "quote.contact_preference", draft.contact_preference || state.workspace.contact_preference || "Text message", ["Text message", "Phone call", "Email", "In-app message"])}
        <label class="full">What do you want done?<textarea data-field="quote.description" maxlength="4000" placeholder="Repairs needed, materials, colors, concerns, timing…">${escapeHtml(draft.description || "")}</textarea></label>
      </div>
    ` : ""}
    ${step === 2 ? `
      <div class="jbs-form-grid">
        ${inputField("Main measurement", "quote.measurement_main", draft.measurement_main || "", false, "text", "Example: 12 ft × 16 ft")}
        ${inputField("Height, depth, or second measurement", "quote.measurement_secondary", draft.measurement_secondary || "", false, "text", "Example: 9 ft ceilings")}
        ${inputField("Planning budget", "quote.budget", draft.budget || "", false, "text", "Optional")}
        ${inputField("Preferred timeframe", "quote.timeframe", draft.timeframe || "", false, "text", "Example: Before October")}
        <label class="full">Materials or colors you like<textarea data-field="quote.materials" maxlength="1000" placeholder="Composite decking, white walls, black gutters…">${escapeHtml(draft.materials || "")}</textarea></label>
        <div class="jbs-help full"><b>Not sure about measurements?</b><p>Send what you have. We will confirm dimensions before a final quote.</p></div>
      </div>
    ` : ""}
    ${step === 3 ? `
      <div class="jbs-upload-zone">
        <span>▧</span><h3>Add up to 6 project photos</h3><p>Use one wide view, close-ups of damage, and a photo showing access.</p>
        <label class="jbs-primary">Choose Photos<input type="file" accept="image/*" multiple data-file="quote-photos" hidden></label>
      </div>
      ${renderDraftPhotos(draft.photos || [], "quote")}
      <div class="jbs-help"><b>Photo privacy</b><p>Photos are attached only to your private account and JB’s owner accounts.</p></div>
    ` : ""}
    ${step === 4 ? renderQuoteReview() : ""}
    <div class="jbs-modal-actions">
      ${step > 1 ? '<button class="jbs-outline" data-action="quote-prev">Back</button>' : '<button class="jbs-outline" data-action="close-modal">Cancel</button>'}
      <button class="jbs-primary" data-action="${step === 4 ? "submit-quote-request" : "quote-next"}">${step === 4 ? "Send Quote Request" : "Continue"}</button>
    </div>
  `;
}

function renderQuoteReview() {
  const draft = state.quoteDraft;
  return `
    <div class="jbs-review-card">
      <span class="jbs-eyebrow">CHECK BEFORE SENDING</span>
      <h3>${escapeHtml(draft.project_type || "Project request")}</h3>
      <dl>
        <div><dt>Name</dt><dd>${escapeHtml(draft.name || displayName())}</dd></div>
        <div><dt>Location</dt><dd>${escapeHtml(draft.location || "Not entered")}</dd></div>
        <div><dt>Contact</dt><dd>${escapeHtml(draft.contact_preference || "In-app message")}</dd></div>
        <div><dt>Timing</dt><dd>${escapeHtml(draft.timeframe || "Flexible")}</dd></div>
        <div><dt>Photos</dt><dd>${(draft.photos || []).length}</dd></div>
      </dl>
      <p>${escapeHtml(draft.description || "")}</p>
      <small>This is a request—not a contract or final quote. JB’s will review the details and contact you.</small>
    </div>
  `;
}

function renderDraftPhotos(photos, namespace) {
  if (!photos.length) return "";
  return `<div class="jbs-photo-grid jbs-draft-photos">${photos.map((photo, index) => `<div class="jbs-photo"><img src="${escapeHtml(safeImageSource(photo.data || photo))}" alt="Selected project photo"><button data-action="remove-draft-photo" data-space="${namespace}" data-index="${index}" aria-label="Remove photo">×</button></div>`).join("")}</div>`;
}

function renderBuilderModal() {
  const step = Math.max(1, Math.min(4, Number(state.builderStep) || 1));
  const result = calculateDeckBuilder(state.builderDraft);
  const stepNames = ["Layout", "Structure", "Finish", "Review"];
  return `
    <div class="jbs-builder-stepper" aria-label="Builder progress">
      ${stepNames.map((name, index) => `<div class="${index + 1 < step ? "done" : index + 1 === step ? "current" : ""}"><span>${index + 1 < step ? "✓" : index + 1}</span><b>${name}</b></div>`).join("")}
    </div>
    <p class="jbs-builder-step-label">Step ${step} of 4 · ${stepNames[step - 1]}</p>
    <div class="jbs-builder-shell">
      <section class="jbs-builder-controls">
        ${renderBuilderStep(step, result)}
      </section>
      <aside class="jbs-builder-preview-panel" aria-label="Live deck plan preview">
        <div class="jbs-builder-preview-content">${renderBuilderPreview(result)}</div>
        <div class="jbs-builder-safety"><b>Planning preview only</b><p>This is not a permit drawing, engineered plan, or final material order. JB’s will verify dimensions, structure, materials, and local requirements before quoting or building.</p></div>
      </aside>
    </div>
    <div class="jbs-modal-actions jbs-builder-actions">
      ${step > 1 ? '<button class="jbs-outline" data-action="builder-prev">Back</button>' : '<button class="jbs-outline" data-action="close-modal">Cancel</button>'}
      ${step < 4
        ? '<button class="jbs-primary" data-action="builder-next">Continue</button>'
        : '<button class="jbs-outline" data-action="save-builder">Save Design</button><button class="jbs-primary" data-action="builder-to-quote">Request JB’s Quote</button>'}
    </div>
  `;
}

function renderBuilderStep(step, result) {
  const draft = result.input;
  if (step === 1) {
    return `
      <span class="jbs-eyebrow">1 · START WITH THE SPACE</span>
      <h3>Choose the deck layout</h3>
      <p>Enter outside dimensions. You can adjust the design as often as you like.</p>
      <div class="jbs-form-grid">
        ${inputField("Design name", "builder.name", draft.name, true, "text", "Example: Backyard deck")}
        ${selectField("Deck shape", "builder.shape", draft.shape, [{ value: "rectangle", label: "Rectangle" }, { value: "l_shape", label: "L-shape" }])}
        ${builderNumberField("Length along the home (ft)", "length", draft.length, 4, 60)}
        ${builderNumberField("Depth from the home (ft)", "depth", draft.depth, 4, 40)}
        ${draft.shape === 'l_shape' ? builderNumberField('Corner cutout width (ft)','notchLength',draft.notchLength,1,draft.length-1,.5)+builderNumberField('Corner cutout depth (ft)','notchDepth',draft.notchDepth,1,draft.depth-1,.5) : ''}
        ${builderNumberField("Deck height (ft)", "height", draft.height, 0, 12, 0.5)}
        ${selectField("Connection", "builder.attachment", draft.attachment, [{ value: "attached", label: "Attached to home" }, { value: "freestanding", label: "Freestanding" }])}
      </div>

    `;
  }
  if (step === 2) {
    return `
      <span class="jbs-eyebrow">2 · STRUCTURE & ACCESS</span>
      <h3>Plan rails and stairs</h3>
      <p>These choices create a preliminary framing and access plan for contractor review.</p>
      <div class="jbs-form-grid">
        ${selectField("Joist spacing", "builder.joistSpacing", draft.joistSpacing, [{ value: 16, label: "16 in. on center" }, { value: 12, label: "12 in. on center" }])}
        ${selectField("Railing coverage", "builder.railing", draft.railing, [{ value: "none", label: "No railing selected" }, { value: "front", label: "Front edge" }, { value: "open_sides", label: "Front and two sides" }, { value: "full", label: "All sides" }])}
        ${selectField("Stair location", "builder.stairLocation", draft.stairLocation, [{ value: "none", label: "No stairs" }, { value: "front", label: "Front" }, { value: "left", label: "Left side" }, { value: "right", label: "Right side" }])}
        ${builderNumberField("Stair width (ft)", "stairWidth", draft.stairWidth, 3, 8, 0.5)}
        ${selectField("Rail style", "builder.railStyle", draft.railStyle, ["Wood rail", "Black aluminum", "Cable-style concept", "White composite", "None"])}
      </div>
      <div class="jbs-warning"><b>Structural choices are provisional</b><p>Final joist, beam, post, footing, stair, and guard sizes depend on product span tables, soil, loads, height, attachment details, and local code.</p></div>
    `;
  }
  if (step === 3) {
    const extras = [
      ["demolition", "Remove an existing deck", "Adds a planning allowance for careful removal and disposal."],
      ["skirting", "Perimeter skirting", "Covers the visible area below the deck."],
      ["lighting", "Low-voltage lighting", "Plans stair and railing accent lights."],
      ["hidden_fasteners", "Hidden fasteners", "Creates a cleaner deck-board surface."],
    ];
    return `
      <span class="jbs-eyebrow">3 · MATERIALS & FINISH</span>
      <h3>Choose the look</h3>
      <p>Compare broad material choices. Real samples and product availability should be confirmed before ordering.</p>
      <div class="jbs-form-grid">
        ${selectField("Decking material", "builder.material", draft.material, Object.entries(DECK_BUILDER_MATERIALS).map(([value, item]) => ({ value, label: item.label })))}
        ${selectField("Color direction", "builder.color", draft.color, ["Natural", "Warm brown", "Cedar tone", "Driftwood gray", "Charcoal", "Custom / undecided"])}
        ${selectField('Board direction','builder.boardDirection',draft.boardDirection,[{value:'length',label:'Along the length'},{value:'depth',label:'Along the depth'}])}
        ${inputField("Preferred timeframe", "builder.timeframe", draft.timeframe, false, "text", "Example: This fall")}
      </div>
      <fieldset class="jbs-builder-extras"><legend>Optional features</legend>
        ${extras.map(([key, title, text]) => `<label><input type="checkbox" data-builder-extra="${key}" ${(draft.extras || []).includes(key) ? "checked" : ""}><span><b>${title}</b><small>${text}</small></span></label>`).join("")}
      </fieldset>
    `;
  }
  return `
    <span class="jbs-eyebrow">4 · REVIEW YOUR CONCEPT</span>
    <h3>${escapeHtml(draft.name)}</h3>
    <p>Review the planning quantities and send the design to JB’s when you are ready.</p>
    <div class="jbs-builder-review-grid">
      <div><span>Layout</span><b>${escapeHtml(result.shapeLabel)} · ${draft.length} × ${draft.depth} ft</b></div>
      <div><span>Decking</span><b>${escapeHtml(result.materialLabel)} · ${escapeHtml(draft.color)}</b></div>
      <div><span>Structure</span><b>${draft.joistSpacing} in. O.C. · ${escapeHtml(result.attachmentLabel)}</b></div>
      <div><span>Access</span><b>${result.stepCount ? `${result.stepCount} planned steps` : "No stairs"} · ${result.railingLinearFeet} lin. ft rail</b></div>
    </div>
    <div class="jbs-builder-takeoff">
      <div class="jbs-section-title"><div><span class="jbs-eyebrow">PRELIMINARY TAKEOFF</span><h3>Planning materials</h3></div></div>
      ${result.materials.map((item) => `<article><div><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.note)}</small></div><strong>${item.quantity} <small>${escapeHtml(item.unit)}</small></strong></article>`).join("")}
    </div>
    ${result.selectedExtras.length ? `<div class="jbs-builder-selected"><b>Included options</b><p>${result.selectedExtras.map((item) => escapeHtml(item.label)).join(" · ")}</p></div>` : ""}
  `;
}

function builderNumberField(label, key, value, minimum, maximum, step = 1) {
  return `<label>${escapeHtml(label)}<input type="number" data-field="builder.${key}" value="${escapeHtml(value)}" min="${minimum}" max="${maximum}" step="${step}" inputmode="decimal" required></label>`;
}

function renderBuilderPreview(result) {
  const draft = result.input;
  return `
    <div class="jbs-builder-budget">
      <span class="jbs-eyebrow">LIVE PLANNING RANGE</span>
      <strong>${formatMoney(result.low)} – ${formatMoney(result.high)}</strong>
      <small>Broad labor-and-material range, not a bid</small>
    </div>
    ${renderBuilderSvg(result)}
    <div class="jbs-builder-stats">
      <div><strong>${result.area}</strong><span>sq. ft.</span></div>
      <div><strong>${result.boardCount}</strong><span>12-ft boards</span></div>
      <div><strong>${result.posts}</strong><span>posts / footings</span></div>
      <div><strong>${result.railingLinearFeet}</strong><span>lin. ft. railing</span></div>
    </div>
    <div class="jbs-builder-preview-note"><b>${escapeHtml(result.shapeLabel)} · ${escapeHtml(result.materialLabel)}</b><span>${draft.length} ft × ${draft.depth} ft · ${draft.height} ft high · ${escapeHtml(result.attachmentLabel)}</span></div>
  `;
}

function renderBuilderSvg(result) {
  return `<div class="jbs-deck-toolbar" role="group" aria-label="Deck view controls"><button data-action="deck-view" data-angle="front">Perspective</button><button data-action="deck-view" data-angle="top">Top</button><button data-action="deck-rotate" data-turn="-20" aria-label="Rotate left">↶</button><button data-action="deck-rotate" data-turn="20" aria-label="Rotate right">↷</button><button data-action="deck-zoom" data-zoom="-.15" aria-label="Zoom out">−</button><button data-action="deck-zoom" data-zoom=".15" aria-label="Zoom in">+</button><button data-action="deck-framing" aria-pressed="${state.builderView.framing}">${state.builderView.framing?'Decking':'Framing'}</button></div><div class="jbs-deck-stage">${renderDeck(result,state.builderView)}</div>`;
}

function renderEstimatorModal() {
  const draft = state.estimatorDraft || (state.estimatorDraft = { service: "painting", quantity: 500, complexity: "standard", access: "easy", extras: 0 });
  const result = estimateProject(draft);
  return `
    <div class="jbs-estimate-result">
      <span class="jbs-eyebrow">ROUGH PLANNING RANGE</span>
      <strong>${formatMoney(result.low)} – ${formatMoney(result.high)}</strong>
      <p>For ${escapeHtml(result.label.toLowerCase())}. This is not a bid or final price.</p>
    </div>
    <div class="jbs-form-grid">
      ${selectField("Project type", "estimate.service", draft.service, Object.entries(SERVICE_ESTIMATES).map(([value, item]) => ({ value, label: item.label })))}
      ${inputField(`Quantity (${escapeHtml(result.unit)})`, "estimate.quantity", draft.quantity, true, "number")}
      ${selectField("Project condition", "estimate.complexity", draft.complexity, [{ value: "standard", label: "Standard" }, { value: "moderate", label: "Moderate repairs" }, { value: "extensive", label: "Extensive repairs" }])}
      ${selectField("Work access", "estimate.access", draft.access, [{ value: "easy", label: "Easy access" }, { value: "limited", label: "Limited access" }, { value: "difficult", label: "Difficult / high access" }])}
      ${inputField("Known permit, disposal, or material extras", "estimate.extras", draft.extras, false, "number")}
    </div>
    <div class="jbs-help"><b>What this includes</b><p>A broad labor-and-material planning range based on your inputs. Site conditions, exact materials, repairs, travel, permits, and final measurements can change the price.</p></div>
    <div class="jbs-modal-actions"><button class="jbs-outline" data-action="save-estimate-plan">Save to a Plan</button><button class="jbs-primary" data-action="estimator-to-quote">Request Exact Quote</button></div>
  `;
}

function renderPlanModal() {
  const draft = state.planDraft;
  return `
    <div class="jbs-form-grid">
      ${inputField("Plan name", "plan.title", draft.title || "", true, "text", "Example: Spring deck rebuild")}
      ${selectField("Project type", "plan.project_type", draft.project_type || "", ["", "Deck or Porch", "Roofing", "Gutters", "Painting", "Flooring", "Siding", "Trailer Repair", "General Remodeling", "Other"])}
      ${inputField("Budget minimum", "plan.budget_min", draft.budget_min || "", false, "number")}
      ${inputField("Budget maximum", "plan.budget_max", draft.budget_max || "", false, "number")}
      ${inputField("Preferred timeframe", "plan.timeframe", draft.timeframe || "", false)}
      <label class="full">Measurements (one per line)<textarea data-field="plan.measurements_text" placeholder="Back wall: 18 ft&#10;Deck depth: 12 ft">${escapeHtml(draft.measurements_text || measurementsToText(draft.measurements))}</textarea></label>
      <label class="full">Materials and colors<textarea data-field="plan.materials_text" placeholder="Composite gray decking&#10;Black aluminum rail">${escapeHtml(draft.materials_text || (draft.materials || []).join("\n"))}</textarea></label>
      <label class="full">Ideas and notes<textarea data-field="plan.notes" maxlength="4000" placeholder="Save project ideas, questions, and priorities…">${escapeHtml(draft.notes || "")}</textarea></label>
    </div>
    <div class="jbs-upload-zone compact"><span>▧</span><div><b>Plan photos</b><p>Add inspiration or project-area photos.</p></div><label class="jbs-outline">Add Photos<input type="file" accept="image/*" multiple data-file="plan-photos" hidden></label></div>
    ${renderDraftPhotos(draft.photos || [], "plan")}
    <div class="jbs-modal-actions"><button class="jbs-outline" data-action="close-modal">Cancel</button><button class="jbs-primary" data-action="save-plan">Save Project Plan</button></div>
  `;
}

function renderAnalyzerModal() {
  const draft = state.analyzerDraft;
  return `
    <div class="jbs-upload-zone">
      <span>▧</span><h3>Check your project photo set</h3><p>This tool checks photo count, resolution, and whether you included a wide view. It does not diagnose structural, electrical, mold, roof, or safety conditions.</p>
      <label class="jbs-primary">Choose Photos<input type="file" accept="image/*" multiple data-file="analyzer-photos" hidden></label>
    </div>
    ${renderDraftPhotos(draft.photos || [], "analyzer")}
    ${draft.result ? `
      <div class="jbs-analyzer-result">
        <div class="jbs-score-ring" style="--score: ${draft.result.score * 3.6}deg"><strong>${draft.result.score}</strong><small>/100</small></div>
        <div><span class="jbs-eyebrow">PHOTO READINESS</span><h3>${draft.result.score >= 75 ? "Strong photo set" : draft.result.score >= 45 ? "Good start" : "Add more detail"}</h3><ul>${draft.result.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      </div>
      <div class="jbs-modal-actions"><button class="jbs-outline" data-action="save-analysis-plan">Save in a Plan</button><button class="jbs-primary" data-action="analyzer-to-quote">Use in Quote Request</button></div>
    ` : '<div class="jbs-help"><b>Best photo set</b><p>Take a wide photo, two close-ups, a side angle, and one photo showing how we can access the area.</p></div>'}
  `;
}

function renderMeasurementsModal() {
  return `
    <p class="jbs-lead">Measurements are saved inside your private project plans so you can find them again.</p>
    ${state.plans.length ? state.plans.map((plan) => `<article class="jbs-measurement-card"><div><b>${escapeHtml(plan.title)}</b><small>${escapeHtml(plan.project_type || "")}</small></div><dl>${Object.entries(plan.measurements || {}).map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("") || "<p>No measurements added.</p>"}</dl><button class="jbs-outline" data-action="edit-plan" data-id="${plan.id}">Edit measurements</button></article>`).join("") : '<section class="jbs-empty"><span>↔</span><h3>No saved measurements</h3><p>Create a project plan to save them.</p></section>'}
    <div class="jbs-modal-actions"><button class="jbs-primary" data-action="open-plan">+ New Measurement Plan</button></div>
  `;
}

function renderMaterialsModal() {
  const saved = state.workspace.saved_colors || [];
  return `
    <p class="jbs-lead">Tap colors to save them. Final color and material choices should be confirmed with real samples in the project lighting.</p>
    <div class="jbs-color-grid">
      ${COLOR_GROUPS.map((color) => `<button class="${saved.includes(color.name) ? "saved" : ""}" data-action="toggle-color" data-color="${escapeHtml(color.name)}"><span style="background: ${color.value}"></span><b>${escapeHtml(color.name)}</b><small>${escapeHtml(color.use)}</small><em>${saved.includes(color.name) ? "✓ Saved" : "+ Save"}</em></button>`).join("")}
    </div>
    <div class="jbs-help"><b>Material reminder</b><p>We will verify product availability, warranty, installation requirements, and final cost before ordering.</p></div>
  `;
}

function renderMaintenanceModal() {
  const completed = state.workspace.maintenance || {};
  return `
    <p class="jbs-lead">A simple seasonal checklist. Marking an item complete saves it to your customer account.</p>
    <div class="jbs-maintenance-list">
      ${["Spring", "Summer", "Fall", "Winter"].map((season) => `<section><h3>${season}</h3>${MAINTENANCE_TASKS.filter((task) => task[1] === season).map(([id, , text]) => `<label><input type="checkbox" data-maintenance="${id}" ${completed[id] ? "checked" : ""}><span>${escapeHtml(text)}</span></label>`).join("")}</section>`).join("")}
    </div>
    <div class="jbs-help"><b>See a problem?</b><p>Take photos and send a quote request or message us. Do not climb onto a roof or enter an unsafe area.</p></div>
  `;
}

function renderInstallModal() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const samsung = /SamsungBrowser/i.test(ua);
  const instructions = ios
    ? ["Open this page in Safari.", "Tap the Share button.", "Choose Add to Home Screen, then tap Add."]
    : samsung
      ? ["Open the browser menu (☰).", "Tap Add page to, then Home screen.", "Confirm Add."]
      : ["Open your browser menu (⋮).", "Choose Install app or Add to Home screen.", "Confirm Install."];
  return `
    <div class="jbs-install-card"><img src="/icon.svg" alt="JB’s app icon"><div><h3>${isInstalled() ? "JB’s is installed" : "Install JB’s on your phone"}</h3><p>Current version ${APP_VERSION}</p></div></div>
    <ol class="jbs-instruction-list">${instructions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
    <div class="jbs-help"><b>Automatic updates</b><p>The app checks for an updated version when it opens. If anything looks old, close and reopen it once.</p></div>
  `;
}

function renderNotificationModal() {
  return `
    <div class="jbs-notification-card"><span>♢</span><h3>Project alerts</h3><p>Get alerts for new messages, quotes, schedule changes, timeline stages, and change orders.</p><button class="jbs-primary" data-action="confirm-notifications">Turn On Notifications</button><small>Your phone or browser will ask for permission.</small></div>
  `;
}

function renderQuoteChangeModal() {
  return `
    <label>What would you like changed?<textarea data-field="change.requested_changes" maxlength="4000" placeholder="Tell Billy and Jeremiah what you want added, removed, or clarified.">${escapeHtml(state.changeDraft.requested_changes || "")}</textarea></label>
    <div class="jbs-modal-actions"><button class="jbs-outline" data-action="close-modal">Cancel</button><button class="jbs-primary" data-action="submit-quote-change">Send Change Request</button></div>
  `;
}

function renderQuoteSignModal() {
  const record = state.records.find((item) => item.id === state.signDraft.recordId);
  if (!record) return "<p>Quote unavailable.</p>";
  const items = Array.isArray(record.line_items) && record.line_items.length ? record.line_items : [{ id: "base", label: record.title, amount: record.amount, optional: false }];
  const selected = state.signDraft.selectedIds || items.map((item) => String(item.id));
  const total = items.filter((item) => !item.optional || selected.includes(String(item.id))).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  state.signDraft.total = total;
  return `
    <p class="jbs-lead">Select optional items, review the total, then provide your legal name and signature.</p>
    <div class="jbs-sign-options">${items.map((item) => `<label><input type="checkbox" data-sign-item="${escapeHtml(item.id)}" ${!item.optional || selected.includes(String(item.id)) ? "checked" : ""} ${!item.optional ? "disabled" : ""}><span><b>${escapeHtml(item.label || item.description)}</b><small>${item.optional ? "Optional" : "Required"}</small></span><strong>${formatMoney(item.amount)}</strong></label>`).join("")}</div>
    <div class="jbs-estimate-result compact"><span>Selected total</span><strong>${formatMoney(total)}</strong></div>
    ${inputField("Full legal name", "sign.name", state.signDraft.name || displayName(), true)}
    <label class="jbs-consent"><input type="checkbox" data-field="sign.consented" ${state.signDraft.consented ? "checked" : ""}><span>I consent to conduct this transaction electronically. I reviewed this quote and selected items, can save or access this electronic record, and intend my typed name and drawn signature to be my legal signature accepting the selected total.</span></label>
    <div class="jbs-signature-wrap"><div><b>Draw your signature</b><button data-action="clear-signature">Clear</button></div><canvas id="jbs-signature-canvas" width="700" height="220" aria-label="Signature drawing area"></canvas></div>
    <div class="jbs-help"><b>Signing audit</b><p>The authenticated account, accepted quote snapshot, selected total, server time, IP address, device information, consent version, and signature are recorded.</p></div>
    <div class="jbs-modal-actions"><button class="jbs-outline" data-action="close-modal">Cancel</button><button class="jbs-primary" data-action="submit-quote-sign">Sign & Accept ${formatMoney(total)}</button></div>
  `;
}

function renderProjectPhotoModal() {
  return `
    <div class="jbs-upload-zone"><span>▧</span><h3>Send a project photo</h3><p>Upload a photo for Billy and Jeremiah to review. Do not enter an unsafe area to take it.</p><label class="jbs-primary">Choose Photo<input type="file" accept="image/*" data-file="project-photo" hidden></label></div>
    ${renderDraftPhotos(state.photoDraft.photos || [], "project")}
    <label>Photo note<textarea data-field="photo.note" maxlength="1000" placeholder="What should we look at?">${escapeHtml(state.photoDraft.note || "")}</textarea></label>
    <div class="jbs-modal-actions"><button class="jbs-outline" data-action="close-modal">Cancel</button><button class="jbs-primary" data-action="submit-project-photo">Send Photo</button></div>
  `;
}

function renderChangeOrderModal() {
  return `
    ${inputField("Change title", "order.title", state.changeDraft.title || "", true, "text", "Example: Add stair lighting")}
    <label>Describe the change<textarea data-field="order.description" maxlength="3000" placeholder="Explain what you want added, removed, or changed.">${escapeHtml(state.changeDraft.description || "")}</textarea></label>
    <div class="jbs-help"><b>Request only</b><p>Sending this does not authorize work or cost. JB’s will review it, add pricing, and return it for approval.</p></div>
    <div class="jbs-modal-actions"><button class="jbs-outline" data-action="close-modal">Cancel</button><button class="jbs-primary" data-action="submit-change-order">Send Request</button></div>
  `;
}

function renderPhotoViewer() {
  return `<figure class="jbs-photo-viewer"><img src="${escapeHtml(safeImageSource(state.modal.source))}" alt="${escapeHtml(state.modal.alt || "Project photo")}"><figcaption>${escapeHtml(state.modal.alt || "Project photo")}</figcaption></figure>`;
}

function inputField(label, field, value, required = false, type = "text", placeholder = "") {
  return `<label>${escapeHtml(label)}<input type="${type}" data-field="${field}" value="${escapeHtml(value ?? "")}" placeholder="${escapeHtml(placeholder)}" ${required ? "required" : ""}></label>`;
}

function selectField(label, field, value, options) {
  const normalized = options.map((option) => typeof option === "string" ? { value: option, label: option || "Choose one" } : option);
  return `<label>${escapeHtml(label)}<select data-field="${field}">${normalized.map((option) => `<option value="${escapeHtml(option.value)}" ${String(value) === String(option.value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>`;
}

function measurementsToText(measurements) {
  return Object.entries(measurements || {}).map(([key, value]) => `${key}: ${value}`).join("\n");
}

function textToMeasurements(text) {
  const output = {};
  String(text || "").split("\n").map((line) => line.trim()).filter(Boolean).forEach((line, index) => {
    const separator = line.indexOf(":");
    if (separator > 0) output[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    else output[`Measurement ${index + 1}`] = line;
  });
  return output;
}

async function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "close-modal-backdrop" && event.target !== target) return;
  event.preventDefault();
  try {
    if (action === "nav") {
      state.view = target.dataset.view;
      state.recordId = null;
      state.modal = null;
      render();
      return;
    }
    if (action === "back-record") {
      state.recordId = null;
      render();
      return;
    }
    if (action === "open-record") {
      state.recordId = target.dataset.id;
      render();
      return;
    }
    if (action === "show-quotes") {
      state.view = "projects";
      render();
      window.setTimeout(() => state.root?.querySelector("#quote-list")?.scrollIntoView({ behavior: "smooth" }), 0);
      return;
    }
    if (action === "scroll-section") {
      state.root?.querySelector(`#${target.dataset.target}`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (action === "refresh") return loadCustomerData(true);
    if (action === "open-quote-request") return openQuoteRequest();
    if (action === "quote-next") return quoteNext();
    if (action === "quote-prev") {
      state.quoteStep = Math.max(1, state.quoteStep - 1);
      render();
      return;
    }
    if (action === "submit-quote-request") return submitQuoteRequest(target);
    if (action === "open-paint") return openPaint();
    if (action === "edit-paint") return openPaint(state.plans.find(p=>String(p.id)===String(target.dataset.id)));
    if (action === "deck-view") { state.builderView.top=target.dataset.angle==='top'; if(!state.builderView.top)state.builderView.yaw=target.dataset.angle==='left'?35:-32;updateBuilderPreview();return; }
    if (action === "deck-rotate") { state.builderView.top=false;state.builderView.yaw+=Number(target.dataset.turn);updateBuilderPreview();return; }
    if (action === "deck-zoom") {state.builderView.zoom=Math.max(.7,Math.min(2,state.builderView.zoom+Number(target.dataset.zoom)));updateBuilderPreview();return;}
    if (action === "deck-framing") {state.builderView.framing=!state.builderView.framing;updateBuilderPreview();return;}
    if (action === "open-builder") return openBuilder();
    if (action === "edit-builder") return editBuilder(target.dataset.id);
    if (action === "builder-next") return builderNext();
    if (action === "builder-prev") {
      state.builderStep = Math.max(1, state.builderStep - 1);
      render();
      return;
    }
    if (action === "save-builder") return await saveBuilder(target);
    if (action === "builder-to-quote") return await builderToQuote(target);
    if (action === "open-estimator") return openModal("estimator", "Rough Cost Estimator");
    if (action === "save-estimate-plan") return saveEstimatePlan();
    if (action === "estimator-to-quote") return estimatorToQuote();
    if (action === "open-plan") return openPlan();
    if (action === "edit-plan") return editPlan(target.dataset.id);
    if (action === "save-plan") return savePlan(target);
    if (action === "open-analyzer") return openAnalyzer();
    if (action === "save-analysis-plan") return saveAnalysisPlan();
    if (action === "analyzer-to-quote") return analyzerToQuote();
    if (action === "open-measurements") return openModal("measurements", "Saved Measurements");
    if (action === "open-materials") return openModal("materials", "Materials & Colors");
    if (action === "toggle-color") return toggleColor(target.dataset.color);
    if (action === "open-maintenance") return openModal("maintenance", "Home Maintenance Center");
    if (action === "open-install") return openModal("install", "Install the App");
    if (action === "enable-notifications" || action === "open-notifications") return openModal("notifications", "Notifications");
    if (action === "confirm-notifications") return enableNotifications(target);
    if (action === "save-idea") return toggleIdea(target.dataset.id);
    if (action === "send-message") return sendMessage(target);
    if (action === "request-quote-change") return openQuoteChange(target.dataset.id);
    if (action === "submit-quote-change") return submitQuoteResponse("changes_requested", target);
    if (action === "open-quote-sign") return openQuoteSign(target.dataset.id);
    if (action === "submit-quote-sign") return submitQuoteResponse("accepted", target);
    if (action === "clear-signature") return clearSignature();
    if (action === "open-project-photo") return openProjectPhoto(target.dataset.id);
    if (action === "submit-project-photo") return submitProjectPhoto(target);
    if (action === "open-change-order") return openChangeOrder(target.dataset.id);
    if (action === "submit-change-order") return submitChangeOrder(target);
    if (action === "respond-change-order") return respondChangeOrder(target.dataset.id, target.dataset.response);
    if (action === "view-photo") return openPhotoViewer(target.dataset.source, target.dataset.alt);
    if (action === "remove-draft-photo") return removeDraftPhoto(target.dataset.space, Number(target.dataset.index));
    if (action === "close-modal" || action === "close-modal-backdrop") {
      state.modal = null;
      render();
      return;
    }
    if (action === "sign-out") return signOut();
  } catch (error) {
    console.error("[JBs customer portal]", error);
    setToast(error?.message || "That action could not be completed.");
  }
}

function handleInput(event) {
  const field = event.target.dataset.field;
  if (!field) return;
  const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  if (field.startsWith("quote.")) state.quoteDraft[field.slice(6)] = value;
  else if (field.startsWith("plan.")) state.planDraft[field.slice(5)] = value;
  else if (field.startsWith("builder.")) {
    state.builderDraft[field.slice(8)] = value;
    if (field === 'builder.shape') { if(value==='l_shape'){state.builderDraft.notchLength=Number(state.builderDraft.length)/2;state.builderDraft.notchDepth=Number(state.builderDraft.depth)/2;}render(); } else updateBuilderPreview();
  }
  else if (field.startsWith("estimate.")) {
    state.estimatorDraft ||= {};
    state.estimatorDraft[field.slice(9)] = value;
    render();
  } else if (field.startsWith("sign.")) state.signDraft[field.slice(5)] = value;
  else if (field.startsWith("change.")) state.changeDraft[field.slice(7)] = value;
  else if (field.startsWith("photo.")) state.photoDraft[field.slice(6)] = value;
  else if (field.startsWith("order.")) state.changeDraft[field.slice(6)] = value;
  else {
    state[field] = value;
    if (field === "exploreSearch") render();
  }
}

async function handleChange(event) {
  const fileType = event.target.dataset.file;
  if (fileType) {
    await handleFiles(fileType, event.target.files);
    return;
  }
  const signItem = event.target.dataset.signItem;
  if (signItem) {
    const selected = new Set(state.signDraft.selectedIds || []);
    event.target.checked ? selected.add(String(signItem)) : selected.delete(String(signItem));
    state.signDraft.selectedIds = [...selected];
    render();
    return;
  }
  const builderExtra = event.target.dataset.builderExtra;
  if (builderExtra) {
    const selected = new Set(state.builderDraft.extras || []);
    event.target.checked ? selected.add(builderExtra) : selected.delete(builderExtra);
    state.builderDraft.extras = [...selected];
    updateBuilderPreview();
    return;
  }
  const maintenance = event.target.dataset.maintenance;
  if (maintenance) {
    state.workspace.maintenance = { ...(state.workspace.maintenance || {}), [maintenance]: event.target.checked };
    await saveWorkspace();
  }
}

function openModal(type, title, extra = {}) {
  state.modal = { type, title, ...extra };
  render();
}

function openQuoteRequest() {
  state.quoteStep = 1;
  state.quoteDraft = {
    name: displayName(),
    contact_preference: state.workspace.contact_preference || "Text message",
    photos: [],
  };
  openModal("quoteRequest", "Request a Quote");
}

function openBuilder(plan = {}) {
  const saved = builderConfigFor(plan)?.input || {};
  const normalized = calculateDeckBuilder(saved).input;
  state.builderStep = 1;
  state.builderDraft = {
    ...normalized,
    id: plan.id || null,
    photos: (plan.photos || []).filter(p=>p!==plan.analyzer_result?.preview),
  };
  openModal("builder", plan.id ? "Edit Deck Design" : "Deck & Project Builder");
}

function editBuilder(id) {
  const plan = state.plans.find((item) => String(item.id) === String(id));
  if (plan) openBuilder(plan);
}

function builderNext() {
  if (state.builderStep === 1 && !clampText(state.builderDraft.name, 200)) {
    setToast("Give your deck design a name before continuing.");
    return;
  }
  const result = calculateDeckBuilder(state.builderDraft);
  const id = state.builderDraft.id;
  const photos = state.builderDraft.photos || [];
  state.builderDraft = { ...result.input, id, photos };
  state.builderStep = Math.min(4, state.builderStep + 1);
  render();
}

function updateBuilderPreview() {
  const preview = state.root?.querySelector(".jbs-builder-preview-content");
  if (preview) preview.innerHTML = renderBuilderPreview(calculateDeckBuilder(state.builderDraft));
}

function builderPayload() {
  const result = calculateDeckBuilder(state.builderDraft);
  const draft = result.input;
  return {
    result,
    payload: {
      user_id: state.session.user.id,
      customer_email: currentEmail(),
      title: clampText(draft.name, 200),
      project_type: "Deck or Porch",
      notes: "Customer-created deck builder concept. All measurements, quantities, structural choices, product selections, site conditions, permits, and code requirements require JB’s review before pricing or construction.",
      budget_min: result.low,
      budget_max: result.high,
      timeframe: clampText(draft.timeframe, 240) || "Flexible",
      measurements: {
        "Deck size": `${draft.length} ft × ${draft.depth} ft`,
        "Shape": result.shapeLabel,
        "Height": `${draft.height} ft`,
        "Connection": result.attachmentLabel,
        "Joist spacing": `${draft.joistSpacing} in. O.C.`,
        "Estimated area": `${result.area} sq. ft.`,
        "Estimated 12-ft deck boards": String(result.boardCount),
        "Estimated posts / footings": String(result.posts),
        "Estimated railing": `${result.railingLinearFeet} lin. ft.`,
      },
      materials: [
        `${result.materialLabel} — ${draft.color}`,
        ...(result.railingLinearFeet ? [`${draft.railStyle} — ${result.railingLinearFeet} lin. ft. planning quantity`] : []),
        ...result.selectedExtras.map((item) => item.label),
      ],
      inspiration: (state.workspace.saved_ideas || []).slice(0, 50),
      photos: (state.builderDraft.photos || []).slice(0, 8).map((photo) => photo.data || photo),
      analyzer_result: {
        tool: "deck_builder",
        version: 1,
        input: draft,
        summary: {
          area: result.area,
          boardCount: result.boardCount,
          joistCount: result.joistCount,
          joistLinearFeet: result.joistLinearFeet,
          beamRows: result.beamRows,
          beamLinearFeet: result.beamLinearFeet,
          posts: result.posts,
          railingLinearFeet: result.railingLinearFeet,
          stepCount: result.stepCount,
          stringerCount: result.stringerCount,
          low: result.low,
          high: result.high,
        },
      },
      status: "draft",
      updated_at: new Date().toISOString(),
    },
  };
}

async function persistBuilder(button, closeWhenDone) {
  if (!clampText(state.builderDraft.name, 200)) throw new Error("Give your deck design a name first.");
  const { result, payload } = builderPayload();
  const svg=renderDeck(result,{yaw:-32,elevation:28,zoom:1});
  const previewImage=await loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));
  const canvas=document.createElement('canvas');canvas.width=1020;canvas.height=645;canvas.getContext('2d').drawImage(previewImage,0,0,1020,645);
  const preview=canvas.toDataURL('image/png');
  payload.photos=[preview,...payload.photos].slice(0,8);
  payload.analyzer_result.preview=preview;
  payload.analyzer_result.version=2;
  setBusy(button, true, "Saving…");
  let saved;
  if (state.demo) {
    const index = state.plans.findIndex((item) => String(item.id) === String(state.builderDraft.id));
    saved = { ...payload, id: state.builderDraft.id || `demo-builder-${Date.now()}`, created_at: new Date().toISOString() };
    if (index >= 0) state.plans[index] = saved;
    else state.plans.unshift(saved);
  } else {
    const query = state.builderDraft.id
      ? client().from("customer_plans").update(payload).eq("id", state.builderDraft.id)
      : client().from("customer_plans").insert(payload);
    const { data, error } = await query.select("*").single();
    setBusy(button, false);
    if (error) throw error;
    saved = data;
    const index = state.plans.findIndex((item) => String(item.id) === String(saved.id));
    if (index >= 0) state.plans[index] = saved;
    else state.plans.unshift(saved);
  }
  state.builderDraft = { ...result.input, id: saved.id, photos: saved.photos || [] };
  if (closeWhenDone) {
    state.modal = null;
    state.view = "projects";
    render();
  }
  return saved;
}

async function saveBuilder(button) {
  await persistBuilder(button, true);
  setToast(state.demo ? "Demo deck design saved." : "Deck design saved to your private plans.");
}

async function builderToQuote(button) {
  const saved = await persistBuilder(button, false);
  const result = calculateDeckBuilder(state.builderDraft);
  const draft = result.input;
  const materialDescription = ["composite", "pvc"].includes(draft.material)
    ? result.materialLabel.toLowerCase()
    : `${result.materialLabel.toLowerCase()} decking`;
  openQuoteRequest();
  state.quoteDraft = {
    ...state.quoteDraft,
    plan_id: saved.id,
    photos: (saved.photos || []).map(data=>({data})),
    project_type: "Deck or Porch",
    description: `I created the “${draft.name}” deck-builder concept and would like JB’s to verify the site and prepare an exact quote. The concept is a ${result.shapeLabel.toLowerCase()}, ${draft.length} ft × ${draft.depth} ft, ${draft.height} ft high, with ${materialDescription}.`,
    measurement_main: `${draft.length} ft × ${draft.depth} ft (${result.area} sq. ft. planning area)`,
    measurement_secondary: `${draft.height} ft high · ${result.attachmentLabel}`,
    budget: `${formatMoney(result.low)}–${formatMoney(result.high)} builder planning range`,
    timeframe: draft.timeframe,
    materials: [`${result.materialLabel} — ${draft.color}`, draft.railStyle, ...result.selectedExtras.map((item) => item.label)].filter(Boolean).join("\n"),
  };
  render();
}

function quoteNext() {
  if (state.quoteStep === 1) {
    const required = ["name", "phone", "project_type", "location", "description"];
    if (required.some((key) => !clampText(state.quoteDraft[key], 4000))) {
      setToast("Complete the project details before continuing.");
      return;
    }
  }
  state.quoteStep = Math.min(4, state.quoteStep + 1);
  render();
}

async function submitQuoteRequest(button) {
  const draft = state.quoteDraft;
  if (!draft.project_type || !draft.description || !draft.name) return setToast("Please complete the required project details.");
  setBusy(button, true, "Sending…");
  const payload = {
    user_id: state.session.user.id,
    customer_email: currentEmail(),
    customer_name: clampText(draft.name, 160),
    phone: clampText(draft.phone, 80) || null,
    project_type: clampText(draft.project_type, 160),
    description: clampText(draft.description, 4000),
    project_location: clampText(draft.location, 500) || null,
    status: "New",
    photos: (draft.photos || []).slice(0, 6).map((photo) => photo.data || photo),
    contact_preference: clampText(draft.contact_preference, 80) || "In-app message",
    measurements: {
      main: clampText(draft.measurement_main, 300),
      secondary: clampText(draft.measurement_secondary, 300),
    },
    budget: clampText(draft.budget, 120) || null,
    timeframe: clampText(draft.timeframe, 240) || null,
    preferred_materials: clampText(draft.materials, 1000).split("\n").map((item) => item.trim()).filter(Boolean),
    plan_id: draft.plan_id || null,
  };
  if (state.demo) {
    const created = { ...payload, id: `demo-request-${Date.now()}`, created_at: new Date().toISOString() };
    state.requests.unshift(created);
    state.modal = null;
    state.view = "projects";
    render();
    setToast("Demo quote request sent.");
    return;
  }
  const { data, error } = await client().from("quote_requests").insert(payload).select("*").single();
  setBusy(button, false);
  if (error) throw error;
  await sendPush("quote_request", { quoteRequestId: data.id });
  state.modal = null;
  state.view = "projects";
  await loadCustomerData(false);
  setToast("Quote request sent. We’ll respond in Messages.");
}

function openPlan(plan = {}) {
  state.planDraft = {
    id: plan.id || null,
    title: plan.title || "",
    project_type: plan.project_type || "",
    budget_min: plan.budget_min || "",
    budget_max: plan.budget_max || "",
    timeframe: plan.timeframe || "",
    measurements: plan.measurements || {},
    materials: plan.materials || [],
    notes: plan.notes || "",
    photos: plan.photos || [],
    analyzer_result: plan.analyzer_result || null,
    status: plan.status || "draft",
  };
  openModal("plan", plan.id ? "Edit Project Plan" : "New Project Plan");
}

function editPlan(id) {
  const plan = state.plans.find((item) => String(item.id) === String(id));
  if (plan) openPlan(plan);
}

async function savePlan(button) {
  const draft = state.planDraft;
  if (!clampText(draft.title, 200)) return setToast("Give the project plan a name.");
  setBusy(button, true, "Saving…");
  const payload = {
    user_id: state.session.user.id,
    customer_email: currentEmail(),
    title: clampText(draft.title, 200),
    project_type: clampText(draft.project_type, 160) || null,
    notes: clampText(draft.notes, 4000) || null,
    budget_min: draft.budget_min === "" ? null : Number(draft.budget_min),
    budget_max: draft.budget_max === "" ? null : Number(draft.budget_max),
    timeframe: clampText(draft.timeframe, 240) || null,
    measurements: textToMeasurements(draft.measurements_text || measurementsToText(draft.measurements)),
    materials: String(draft.materials_text || (draft.materials || []).join("\n")).split("\n").map((item) => item.trim()).filter(Boolean),
    inspiration: (state.workspace.saved_ideas || []).slice(0, 50),
    photos: (draft.photos || []).slice(0, 8).map((photo) => photo.data || photo),
    analyzer_result: draft.analyzer_result || null,
    status: draft.status || "draft",
    updated_at: new Date().toISOString(),
  };
  if (state.demo) {
    const index = state.plans.findIndex((item) => item.id === draft.id);
    const next = { ...payload, id: draft.id || `demo-plan-${Date.now()}`, created_at: new Date().toISOString() };
    if (index >= 0) state.plans[index] = next;
    else state.plans.unshift(next);
    state.modal = null;
    state.view = "projects";
    render();
    setToast("Demo plan saved.");
    return;
  }
  const query = draft.id
    ? client().from("customer_plans").update(payload).eq("id", draft.id)
    : client().from("customer_plans").insert(payload);
  const { error } = await query.select("id").single();
  setBusy(button, false);
  if (error) throw error;
  state.modal = null;
  state.view = "projects";
  await loadCustomerData(false);
  setToast("Project plan saved.");
}

function saveEstimatePlan() {
  const result = estimateProject(state.estimatorDraft || {});
  openPlan({
    title: `${result.label} Plan`,
    project_type: result.label,
    budget_min: result.low,
    budget_max: result.high,
    notes: "Planning range created with the rough cost estimator. Final price requires contractor review.",
  });
}

function estimatorToQuote() {
  const result = estimateProject(state.estimatorDraft || {});
  openQuoteRequest();
  state.quoteDraft.project_type = result.label;
  state.quoteDraft.budget = `${formatMoney(result.low)}–${formatMoney(result.high)} planning range`;
  state.quoteDraft.description = "I used the rough cost estimator and would like an exact quote.";
  render();
}

function openAnalyzer() {
  state.analyzerDraft = { photos: [], result: null };
  openModal("analyzer", "Photo Project Check");
}

function saveAnalysisPlan() {
  const result = state.analyzerDraft.result;
  openPlan({
    title: "Photo Project Plan",
    notes: result ? result.recommendations.join("\n") : "",
    photos: state.analyzerDraft.photos,
    analyzer_result: result,
  });
}

function analyzerToQuote() {
  const photos = [...state.analyzerDraft.photos];
  openQuoteRequest();
  state.quoteDraft.photos = photos;
  state.quoteDraft.description = "I used the photo project check and attached the project views.";
  render();
}

async function toggleColor(color) {
  const colors = new Set(state.workspace.saved_colors || []);
  colors.has(color) ? colors.delete(color) : colors.add(color);
  state.workspace.saved_colors = [...colors];
  await saveWorkspace();
  render();
}

async function toggleIdea(id) {
  const ideas = new Set(state.workspace.saved_ideas || []);
  ideas.has(id) ? ideas.delete(id) : ideas.add(id);
  state.workspace.saved_ideas = [...ideas];
  await saveWorkspace();
  render();
}

async function saveWorkspace() {
  if (state.demo) {
    render();
    return;
  }
  const payload = {
    user_id: state.session.user.id,
    customer_email: currentEmail(),
    maintenance: state.workspace.maintenance || {},
    saved_colors: state.workspace.saved_colors || [],
    saved_ideas: state.workspace.saved_ideas || [],
    contact_preference: state.workspace.contact_preference || "In-app message",
    updated_at: new Date().toISOString(),
  };
  const { error } = await client().from("customer_workspace").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

async function sendMessage(button) {
  const textarea = state.root.querySelector(".jbs-message-composer textarea");
  const message = clampText(textarea?.value, 4000);
  if (!message) return;
  setBusy(button, true, "Sending…");
  if (state.demo) {
    state.messages.push({
      id: `demo-message-${Date.now()}`,
      customer_user_id: "demo",
      customer_email: "demo@example.com",
      sender_user_id: "demo",
      sender_role: "customer",
      message,
      created_at: new Date().toISOString(),
    });
    render();
    setToast("Demo message sent.");
    return;
  }
  const { data, error } = await client().from("customer_messages").insert({
    customer_user_id: state.session.user.id,
    customer_email: currentEmail(),
    sender_user_id: state.session.user.id,
    sender_role: "customer",
    message,
  }).select("id").single();
  setBusy(button, false);
  if (error) throw error;
  await sendPush("message", { messageId: data.id });
  await loadCustomerData(false);
}

async function markMessagesRead() {
  if (!state.session || state.demo) return;
  const unread = state.messages.filter((message) => message.sender_role === "owner" && !state.reads.some((read) => read.message_id === message.id && read.user_id === state.session.user.id));
  if (!unread.length) return;
  const rows = unread.map((message) => ({
    message_id: message.id,
    user_id: state.session.user.id,
    reader_role: "customer",
    reader_name: "Customer",
    read_at: new Date().toISOString(),
  }));
  const { error } = await client().from("message_reads").upsert(rows, { onConflict: "message_id,user_id" });
  if (!error) state.reads.push(...rows);
}

function openQuoteChange(recordId) {
  state.changeDraft = { recordId, requested_changes: "" };
  openModal("quoteChange", "Request Quote Changes");
}

function openQuoteSign(recordId) {
  const record = state.records.find((item) => item.id === recordId);
  const items = record?.line_items?.length ? record.line_items : [{ id: "base", optional: false }];
  state.signDraft = { recordId, selectedIds: items.map((item) => String(item.id)), name: displayName(), consented: false, signatureData: "" };
  openModal("quoteSign", "Accept & Sign Quote");
}

async function submitQuoteResponse(responseStatus, button) {
  const draft = responseStatus === "accepted" ? state.signDraft : state.changeDraft;
  if (responseStatus === "changes_requested" && !clampText(draft.requested_changes, 4000)) return setToast("Explain the change you want.");
  if (responseStatus === "accepted" && (!clampText(draft.name, 200) || !draft.consented || !draft.signatureData)) return setToast("Enter your name, consent, and draw your signature.");
  setBusy(button, true, "Submitting…");
  if (state.demo) {
    const response = {
      quote_id: draft.recordId,
      user_id: "demo",
      response_status: responseStatus,
      requested_changes: responseStatus === "changes_requested" ? draft.requested_changes : null,
      signer_name: responseStatus === "accepted" ? draft.name : null,
      accepted_total: responseStatus === "accepted" ? draft.total : null,
      signed_at: responseStatus === "accepted" ? new Date().toISOString() : null,
      audit_id: `demo-audit-${Date.now()}`,
    };
    state.quoteResponses = state.quoteResponses.filter((item) => item.quote_id !== draft.recordId);
    state.quoteResponses.push(response);
    state.modal = null;
    render();
    setToast(responseStatus === "accepted" ? "Demo quote signed." : "Demo change request sent.");
    return;
  }
  const response = await fetch("/api/quote-response", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${state.session.access_token}` },
    body: JSON.stringify({
      quoteId: draft.recordId,
      responseStatus,
      selectedIds: draft.selectedIds || [],
      requestedChanges: draft.requested_changes || "",
      signerName: draft.name || "",
      signatureData: draft.signatureData || "",
      consented: Boolean(draft.consented),
    }),
  });
  const result = await response.json();
  setBusy(button, false);
  if (!response.ok) throw new Error(result.error || "Could not submit your response.");
  await sendPush("quote_response", { quoteId: draft.recordId, quoteResponseId: result.response?.quote_id || draft.recordId });
  state.modal = null;
  await loadCustomerData(false);
  setToast(responseStatus === "accepted" ? "Signed quote submitted." : "Change request submitted.");
}

function openProjectPhoto(recordId) {
  state.photoDraft = { recordId, photos: [], note: "" };
  openModal("projectPhoto", "Add a Project Photo");
}

async function submitProjectPhoto(button) {
  const photo = state.photoDraft.photos?.[0];
  if (!photo) return setToast("Choose a photo first.");
  const record = state.records.find((item) => item.id === state.photoDraft.recordId);
  setBusy(button, true, "Sending…");
  const eventRow = {
    record_id: record.id,
    customer_user_id: state.session.user.id,
    customer_email: currentEmail(),
    event_type: "customer_photo",
    title: "Customer photo",
    description: clampText(state.photoDraft.note, 1000) || "Photo uploaded by the customer.",
    event_date: new Date().toISOString(),
    media: [photo.data],
    created_by: state.session.user.id,
    created_by_name: displayName(),
  };
  if (state.demo) {
    state.events.push({ ...eventRow, id: `demo-photo-${Date.now()}` });
    state.modal = null;
    render();
    setToast("Demo project photo added.");
    return;
  }
  const { data, error } = await client().from("project_events").insert(eventRow).select("id").single();
  setBusy(button, false);
  if (error) throw error;
  await sendPush("customer_photo", { eventId: data.id });
  state.modal = null;
  await loadCustomerData(false);
  setToast("Photo sent to Billy and Jeremiah.");
}

function openChangeOrder(recordId) {
  state.changeDraft = { recordId, title: "", description: "" };
  openModal("changeOrder", "Request a Project Change");
}

async function submitChangeOrder(button) {
  const record = state.records.find((item) => item.id === state.changeDraft.recordId);
  if (!record || !clampText(state.changeDraft.title, 200) || !clampText(state.changeDraft.description, 3000)) return setToast("Add a title and description.");
  setBusy(button, true, "Sending…");
  const payload = {
    record_id: record.id,
    customer_user_id: state.session.user.id,
    customer_email: currentEmail(),
    title: clampText(state.changeDraft.title, 200),
    description: clampText(state.changeDraft.description, 3000),
    amount: null,
    status: "requested",
    requested_by_role: "customer",
    created_by: state.session.user.id,
  };
  if (state.demo) {
    state.changeOrders.unshift({ ...payload, id: `demo-order-${Date.now()}`, created_at: new Date().toISOString() });
    state.modal = null;
    render();
    setToast("Demo change request sent.");
    return;
  }
  const { data, error } = await client().from("change_orders").insert(payload).select("id").single();
  setBusy(button, false);
  if (error) throw error;
  await sendPush("change_order", { changeOrderId: data.id });
  state.modal = null;
  await loadCustomerData(false);
  setToast("Change request sent for pricing.");
}

async function respondChangeOrder(id, responseStatus) {
  const order = state.changeOrders.find((item) => item.id === id);
  if (!order) return;
  const note = responseStatus === "approved" ? "Approved in the customer portal." : "Declined in the customer portal.";
  if (state.demo) {
    state.changeOrderResponses.push({ change_order_id: id, user_id: "demo", response_status: responseStatus, customer_response_note: note, responded_at: new Date().toISOString() });
    render();
    setToast(`Change order ${responseStatus}.`);
    return;
  }
  const { error } = await client().from("change_order_responses").upsert({
    change_order_id: id,
    user_id: state.session.user.id,
    response_status: responseStatus,
    customer_response_note: note,
    responded_at: new Date().toISOString(),
  }, { onConflict: "change_order_id,user_id" });
  if (error) throw error;
  await sendPush("change_order_response", { changeOrderId: id });
  await loadCustomerData(false);
  setToast(`Change order ${responseStatus}.`);
}

function openPhotoViewer(source, alt) {
  openModal("photoViewer", alt || "Project Photo", { source, alt });
}

function removeDraftPhoto(space, index) {
  const target = space === "quote" ? state.quoteDraft : space === "plan" ? state.planDraft : space === "analyzer" ? state.analyzerDraft : state.photoDraft;
  target.photos = (target.photos || []).filter((_photo, photoIndex) => photoIndex !== index);
  if (space === "analyzer") target.result = analyzePhotoMetrics(target.photos);
  render();
}

async function handleFiles(type, fileList) {
  const limits = { "quote-photos": 6, "plan-photos": 8, "analyzer-photos": 6, "project-photo": 1 };
  const max = limits[type] || 4;
  const photos = await Promise.all([...fileList].slice(0, max).map(resizeImage));
  if (type === "quote-photos") state.quoteDraft.photos = [...(state.quoteDraft.photos || []), ...photos].slice(0, max);
  if (type === "plan-photos") state.planDraft.photos = [...(state.planDraft.photos || []), ...photos].slice(0, max);
  if (type === "analyzer-photos") {
    state.analyzerDraft.photos = [...(state.analyzerDraft.photos || []), ...photos].slice(0, max);
    state.analyzerDraft.result = analyzePhotoMetrics(state.analyzerDraft.photos);
  }
  if (type === "project-photo") state.photoDraft.photos = photos.slice(0, 1);
  render();
}

async function resizeImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose a photo smaller than 15 MB.");
  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  return { data: canvas.toDataURL("image/jpeg", 0.78), width, height, name: file.name, originalSize: file.size };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("The photo could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The photo could not be opened."));
    image.src = source;
  });
}

function setupSignatureCanvas() {
  const canvas = state.root?.querySelector("#jbs-signature-canvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  context.lineWidth = 4;
  context.lineCap = "round";
  context.strokeStyle = "#172033";
  let drawing = false;
  const point = (event) => {
    const rectangle = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rectangle.left) * (canvas.width / rectangle.width),
      y: (event.clientY - rectangle.top) * (canvas.height / rectangle.height),
    };
  };
  const start = (event) => {
    drawing = true;
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
    canvas.setPointerCapture?.(event.pointerId);
  };
  const move = (event) => {
    if (!drawing) return;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
  };
  const end = () => {
    if (!drawing) return;
    drawing = false;
    state.signDraft.signatureData = canvas.toDataURL("image/png");
  };
  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  if (state.signDraft.signatureData) {
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = state.signDraft.signatureData;
  }
}

function clearSignature() {
  state.signDraft.signatureData = "";
  const canvas = state.root?.querySelector("#jbs-signature-canvas");
  canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
}

async function enableNotifications(button) {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Push notifications are not supported in this browser.");
  setBusy(button, true, "Waiting…");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    setBusy(button, false);
    throw new Error("Notifications were not enabled. You can allow them later in browser settings.");
  }
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUSH_PUBLIC_KEY) });
  const json = subscription.toJSON();
  await sendPush("subscribe", { subscription: { endpoint: subscription.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth } });
  state.modal = null;
  render();
  setToast("Notifications are on.");
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function sendPush(eventType, payload = {}) {
  if (state.demo || !client()) return;
  const { error } = await client().functions.invoke("push-notify", { body: { eventType, ...payload } });
  if (error) console.warn("[JBs push]", error);
}

async function signOut() {
  if (state.demo) {
    state.root?.remove();
    state.root = null;
    const ownerSession=state.previewOwnerSession;
    state.previewOwnerSession=null;
    state.session = null;
    state.demo = false;
    state.modal=null;
    if (ownerSession) {await bootCustomer(ownerSession);return;}
    enhanceEntry();
    return;
  }
  await client().auth.signOut();
}

function setBusy(button, busy, text = "Please wait…") {
  if (!button) return;
  if (busy) {
    button.dataset.originalText ||= button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}


function openPaint(plan) {
  const saved=plan?.analyzer_result?.tool==='paint_visualizer'?plan.analyzer_result:null;
  state.paintDraft={...paintDefaults(),...(saved?.config||{}),id:plan?.id||null,name:plan?.title||saved?.config?.name||'My Paint Preview',photo:saved?.photo||'',areas:structuredClone(saved?.areas||[]),points:[],active:-1};
  openModal('paint','Photo Paint Visualizer');
}
async function persistPaint(d,preview,requestQuote,button) {
  if(!clampText(d.name,200))throw new Error('Give the paint plan a name.');
  const payload={user_id:state.session.user.id,customer_email:currentEmail(),title:clampText(d.name,200),project_type:d.setting+' Painting',notes:'Customer paint concept on their original photo. Verify colors using physical samples before ordering.',materials:d.areas.map(a=>a.name+': '+a.color),photos:[d.photo,preview],analyzer_result:{tool:'paint_visualizer',version:1,photo:d.photo,areas:d.areas,config:{name:d.name,setting:d.setting,color:d.color,strength:d.strength}},status:'draft',updated_at:new Date().toISOString()};
  let saved;
  if(state.demo)saved={...payload,id:d.id||'demo-paint-'+Date.now()};
  else {const query=d.id?client().from('customer_plans').update(payload).eq('id',d.id):client().from('customer_plans').insert(payload);const {data,error}=await query.select('*').single();if(error)throw error;saved=data;}
  const idx=state.plans.findIndex(p=>p.id===saved.id);if(idx<0)state.plans.unshift(saved);else state.plans[idx]=saved;d.id=saved.id;
  if(requestQuote){openQuoteRequest();state.quoteDraft={...state.quoteDraft,plan_id:saved.id,project_type:d.setting+' Painting',description:'Please quote the '+d.setting.toLowerCase()+' painting shown in my saved paint preview: '+d.areas.map(a=>a.name+' ('+a.color+')').join(', '),materials:payload.materials.join('\n'),photos:[{data:d.photo},{data:preview}]};render();}
  else{state.modal=null;state.view='projects';render();setToast(state.demo?'Demo paint plan saved.':'Paint plan saved to your private plans.');}
}
let deckDrag=null;
document.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-deck-scene]'))return;deckDrag={x:e.clientX,y:e.clientY,yaw:state.builderView.yaw,elevation:state.builderView.elevation};e.preventDefault();});
document.addEventListener('pointermove',e=>{if(!deckDrag)return;state.builderView.top=false;state.builderView.yaw=deckDrag.yaw+(e.clientX-deckDrag.x)*.4;state.builderView.elevation=Math.max(12,Math.min(65,deckDrag.elevation-(e.clientY-deckDrag.y)*.18));updateBuilderPreview();});
document.addEventListener('pointerup',()=>{deckDrag=null;});
document.addEventListener('pointercancel',()=>{deckDrag=null;});

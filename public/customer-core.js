export const APP_VERSION = "2.2.0";

export const TIMELINE_STAGES = [
  { id: "estimate_requested", label: "Estimate Requested" },
  { id: "quote_sent", label: "Quote Sent" },
  { id: "quote_approved", label: "Quote Approved" },
  { id: "scheduled", label: "Scheduled" },
  { id: "materials_ready", label: "Materials Ready" },
  { id: "work_started", label: "Work Started" },
  { id: "work_in_progress", label: "Work in Progress" },
  { id: "final_walkthrough", label: "Final Walkthrough" },
  { id: "completed", label: "Completed" },
];

export const SERVICE_ESTIMATES = {
  painting: { label: "Interior Painting", unit: "square feet", low: 2.25, high: 5.5, minimum: 750 },
  deck: { label: "Deck or Porch", unit: "square feet", low: 32, high: 72, minimum: 1_200 },
  roofing: { label: "Roofing", unit: "roofing squares", low: 520, high: 980, minimum: 3_500 },
  gutters: { label: "Gutters", unit: "linear feet", low: 13, high: 31, minimum: 850 },
  flooring: { label: "Flooring", unit: "square feet", low: 6, high: 18, minimum: 700 },
  siding: { label: "Siding", unit: "square feet", low: 8, high: 19, minimum: 2_500 },
  trailer: { label: "Trailer Repair", unit: "estimated labor hours", low: 95, high: 175, minimum: 350 },
  repairs: { label: "General Repairs", unit: "estimated labor hours", low: 85, high: 165, minimum: 250 },
};

export const DECK_BUILDER_MATERIALS = {
  pressure_treated: { label: "Pressure-treated wood", costFactor: 1 },
  cedar: { label: "Cedar", costFactor: 1.12 },
  composite: { label: "Composite decking", costFactor: 1.3 },
  pvc: { label: "PVC decking", costFactor: 1.55 },
};

const DECK_EXTRAS = {
  demolition: { label: "Remove an existing deck" },
  skirting: { label: "Perimeter skirting" },
  lighting: { label: "Low-voltage stair and rail lighting" },
  hidden_fasteners: { label: "Hidden deck-board fasteners" },
};

function boundedNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  return Math.max(minimum, Math.min(maximum, Number.isFinite(parsed) ? parsed : fallback));
}

function roundPlanningCost(value) {
  return Math.round(value / 25) * 25;
}

export function calculateDeckBuilder(input = {}) {
  const shape = input.shape === "l_shape" ? "l_shape" : "rectangle";
  const attachment = input.attachment === "freestanding" ? "freestanding" : "attached";
  const material = DECK_BUILDER_MATERIALS[input.material] ? input.material : "pressure_treated";
  const railing = ["none", "front", "open_sides", "full"].includes(input.railing) ? input.railing : "open_sides";
  const stairLocation = ["none", "front", "left", "right"].includes(input.stairLocation) ? input.stairLocation : "front";
  const length = boundedNumber(input.length, 4, 60, 16);
  const depth = boundedNumber(input.depth, 4, 40, 12);
  const height = boundedNumber(input.height, 0, 12, 3);
  const stairWidth = boundedNumber(input.stairWidth, 3, 8, 4);
  const joistSpacing = Number(input.joistSpacing) === 12 ? 12 : 16;
  const notchLength = shape === "l_shape" ? boundedNumber(input.notchLength, 1, length - 1, length / 2) : 0;
  const notchDepth = shape === "l_shape" ? boundedNumber(input.notchDepth, 1, depth - 1, depth / 2) : 0;
  const exactArea = length * depth - notchLength * notchDepth;
  const shapeFactor = exactArea / (length * depth);
  const area = Math.round(exactArea * 10) / 10;
  const perimeter = length * 2 + depth * 2;
  const joistCount = Math.ceil((length * 12) / joistSpacing) + 1;
  const joistLinearFeet = Math.ceil(joistCount * depth * shapeFactor);
  const beamRows = Math.max(1, Math.ceil(depth / 8)) + (attachment === "freestanding" ? 1 : 0);
  const beamLinearFeet = Math.ceil(beamRows * length * shapeFactor);
  const posts = beamRows * (Math.ceil(length / 6) + 1);
  const boardCount = Math.ceil((area / 5.5) * 1.1);
  const stairEdgeLength = stairLocation === "front" ? length - notchLength : stairLocation === "right" ? depth - notchDepth : depth;
  const actualStairWidth = Math.min(stairWidth, stairEdgeLength);
  const hasStairGap = stairLocation !== "none" && height > 0.5 && railing !== "none" && (railing !== "front" || stairLocation === "front");
  const railingLinearFeet = Math.max(0, Math.round(({none: 0, front: length - notchLength, open_sides: length + depth * 2, full: perimeter}[railing] || 0) - (hasStairGap ? actualStairWidth : 0)));

  const stepCount = stairLocation === "none" || height <= 0.5 ? 0 : Math.max(1, Math.ceil((height * 12) / 7.5));
  const stringerCount = stepCount ? Math.max(3, Math.ceil((stairWidth * 12) / 16) + 1) : 0;
  const extras = [...new Set((Array.isArray(input.extras) ? input.extras : []).filter((key) => DECK_EXTRAS[key]))];

  const materialFactor = DECK_BUILDER_MATERIALS[material].costFactor;
  let low = Math.max(1_200, area * 32 * materialFactor);
  let high = Math.max(1_500, area * 72 * materialFactor);
  low += railingLinearFeet * 48 + (stepCount ? 850 + stepCount * 95 : 0);
  high += railingLinearFeet * 105 + (stepCount ? 1_650 + stepCount * 220 : 0);
  if (extras.includes("demolition")) { low += area * 8; high += area * 15; }
  if (extras.includes("skirting")) { low += perimeter * 14; high += perimeter * 32; }
  if (extras.includes("lighting")) { low += 500; high += 1_500; }
  if (extras.includes("hidden_fasteners")) { low += area * 3; high += area * 7; }

  const normalizedInput = {
    name: String(input.name || "My Deck Design").trim().slice(0, 200) || "My Deck Design",
    shape,
    notchLength,
    notchDepth,
    boardDirection: input.boardDirection === "depth" ? "depth" : "length",
    length,
    depth,
    height,
    attachment,
    joistSpacing,
    railing,
    stairLocation,
    stairWidth: actualStairWidth,
    material,
    color: String(input.color || "Natural").trim().slice(0, 80) || "Natural",
    railStyle: String(input.railStyle || (railing === "none" ? "None" : "Wood rail")).trim().slice(0, 100),
    timeframe: String(input.timeframe || "Flexible").trim().slice(0, 240),
    extras,
  };

  return {
    input: normalizedInput,
    shapeLabel: shape === "l_shape" ? "L-shaped" : "Rectangle",
    attachmentLabel: attachment === "freestanding" ? "Freestanding" : "Attached to home",
    materialLabel: DECK_BUILDER_MATERIALS[material].label,
    area,
    perimeter,
    joistCount,
    joistLinearFeet,
    beamRows,
    beamLinearFeet,
    posts,
    boardCount,
    railingLinearFeet,
    stepCount,
    stringerCount,
    low: roundPlanningCost(low),
    high: roundPlanningCost(Math.max(high, low * 1.2)),
    materials: [
      { label: "12-ft deck boards", quantity: boardCount, unit: "boards", note: "Includes about 10% planning waste" },
      { label: "Joists", quantity: joistLinearFeet, unit: "linear ft", note: `${joistCount} joist lines at ${joistSpacing} in. O.C.` },
      { label: "Beams", quantity: beamLinearFeet, unit: "linear ft", note: `${beamRows} planning beam row${beamRows === 1 ? "" : "s"}` },
      { label: "Posts / footings", quantity: posts, unit: "each", note: "Size and depth require site and code verification" },
      ...(railingLinearFeet ? [{ label: "Railing", quantity: railingLinearFeet, unit: "linear ft", note: normalizedInput.railStyle }] : []),
      ...(stepCount ? [{ label: "Stair stringers", quantity: stringerCount, unit: "each", note: `${stepCount} planned step${stepCount === 1 ? "" : "s"}` }] : []),
    ],
    selectedExtras: extras.map((key) => ({ key, label: DECK_EXTRAS[key].label })),
  };
}

const COMPLEXITY = { standard: 1, moderate: 1.25, extensive: 1.6 };
const ACCESS = { easy: 1, limited: 1.12, difficult: 1.28 };

export function estimateProject(input = {}) {
  const service = SERVICE_ESTIMATES[input.service] || SERVICE_ESTIMATES.repairs;
  const quantity = Math.max(1, Math.min(100_000, Number(input.quantity) || 1));
  const complexity = COMPLEXITY[input.complexity] || COMPLEXITY.standard;
  const access = ACCESS[input.access] || ACCESS.easy;
  const extras = Math.max(0, Math.min(100_000, Number(input.extras) || 0));
  const low = Math.max(service.minimum, quantity * service.low * complexity * access + extras);
  const high = Math.max(service.minimum * 1.25, quantity * service.high * complexity * access + extras * 1.2);
  return {
    low: Math.round(low / 25) * 25,
    high: Math.round(Math.max(high, low * 1.2) / 25) * 25,
    label: service.label,
    unit: service.unit,
  };
}

export function statusToStage(status = "") {
  const value = String(status).trim().toLowerCase();
  if (value.includes("complete")) return "completed";
  if (value.includes("walkthrough")) return "final_walkthrough";
  if (value.includes("progress")) return "work_in_progress";
  if (value.includes("started")) return "work_started";
  if (value.includes("material")) return "materials_ready";
  if (value.includes("scheduled")) return "scheduled";
  if (value.includes("approved") || value.includes("accepted")) return "quote_approved";
  if (value.includes("quote") || value.includes("open")) return "quote_sent";
  return "estimate_requested";
}

export function buildTimeline(currentStage, events = []) {
  const current = TIMELINE_STAGES.findIndex((stage) => stage.id === currentStage);
  const currentIndex = current >= 0 ? current : 0;
  const dates = new Map();
  for (const event of events) {
    if (event?.event_type === "stage" && event.stage) {
      const existing = dates.get(event.stage);
      const candidate = event.event_date || event.created_at;
      if (!existing || String(candidate) > String(existing)) dates.set(event.stage, candidate);
    }
  }
  return TIMELINE_STAGES.map((stage, index) => ({
    ...stage,
    state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "future",
    date: dates.get(stage.id) || null,
  }));
}

export function analyzePhotoMetrics(photos = []) {
  const valid = photos.filter((photo) => Number(photo?.width) > 0 && Number(photo?.height) > 0);
  const landscape = valid.filter((photo) => photo.width >= photo.height).length;
  const highResolution = valid.filter((photo) => photo.width >= 1000 || photo.height >= 1000).length;
  let score = Math.min(55, valid.length * 18) + Math.min(25, highResolution * 9) + (landscape ? 10 : 0);
  score = Math.min(100, score);
  const recommendations = [];
  if (valid.length < 3) recommendations.push("Add a wide view, a close-up, and one photo showing access to the work area.");
  if (highResolution < valid.length) recommendations.push("Retake blurry or low-resolution photos in brighter light.");
  if (!landscape) recommendations.push("Add one landscape photo showing the full project area.");
  if (!recommendations.length) recommendations.push("Your photo set gives us a strong starting view. Final pricing still requires contractor review.");
  return { score, photoCount: valid.length, highResolution, landscape, recommendations };
}

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function formatDate(value, options = {}) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: options.year === false ? undefined : "numeric",
    hour: options.time ? "numeric" : undefined,
    minute: options.time ? "2-digit" : undefined,
  }).format(date);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

export function safeImageSource(value) {
  const source = String(value || "");
  return source.startsWith("data:image/") || source.startsWith("https://") ? source : "";
}

export function clampText(value, maximum = 4_000) {
  return String(value || "").trim().slice(0, maximum);
}


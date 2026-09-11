import { NextResponse } from "next/server";

const SUPABASE_URL = "https://bjmdtxxlzzhxskxkllvt.supabase.co";
const SUPABASE_KEY = "sb_publishable_UlU-Bo7t_Hv9lypvIjm9qQ_HaO65V9a";

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function supabaseRequest(path, token, init = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

export async function POST(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return jsonError("Please sign in again before responding.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("The response could not be read.");
  }

  const quoteId = String(body.quoteId || "").trim();
  const responseStatus = body.responseStatus;
  if (!quoteId || !["accepted", "changes_requested"].includes(responseStatus)) {
    return jsonError("Choose either Accept or Request Changes.");
  }

  const userResponse = await supabaseRequest("/auth/v1/user", token);
  if (!userResponse.ok) return jsonError("Your sign-in expired. Please sign in again.", 401);
  const user = await userResponse.json();
  const customerEmail = String(user.email || "").toLowerCase();
  if (!user.id || !customerEmail) return jsonError("Your customer account could not be verified.", 401);

  const quoteParams = new URLSearchParams({
    id: `eq.${quoteId}`,
    record_type: "eq.quote",
    select: "id,title,customer_email,status,amount,record_date,location,line_items",
  });
  const quoteResponse = await supabaseRequest(`/rest/v1/customer_records?${quoteParams}`, token);
  if (!quoteResponse.ok) return jsonError("This quote could not be opened.", 403);
  const [quote] = await quoteResponse.json();
  if (!quote || String(quote.customer_email || "").toLowerCase() !== customerEmail) {
    return jsonError("This quote is not assigned to your account.", 403);
  }

  const lineItems = Array.isArray(quote.line_items) && quote.line_items.length
    ? quote.line_items
    : [{ id: "base", label: quote.title, amount: Number(quote.amount || 0), optional: false }];
  const selectedIds = new Set((Array.isArray(body.selectedIds) ? body.selectedIds : []).map(String));
  const selectedItems = lineItems
    .filter((item) => !item.optional || selectedIds.has(String(item.id)))
    .map((item) => ({
      id: String(item.id),
      label: String(item.label || "").slice(0, 500),
      amount: Number(item.amount || 0),
      optional: Boolean(item.optional),
    }));

  if (selectedItems.some((item) => !Number.isFinite(item.amount) || item.amount < -1000000 || item.amount > 1000000)) {
    return jsonError("This quote contains an invalid price. Please contact us.");
  }
  const acceptedTotal = selectedItems.reduce((total, item) => total + item.amount, 0);

  const requestedChanges = String(body.requestedChanges || "").trim();
  const signerName = String(body.signerName || "").trim();
  const signatureData = String(body.signatureData || "");
  const consented = body.consented === true;

  if (responseStatus === "changes_requested" && (!requestedChanges || requestedChanges.length > 4000)) {
    return jsonError("Explain the requested change in 4,000 characters or fewer.");
  }
  if (responseStatus === "accepted") {
    if (!consented || !signerName || signerName.length > 160) {
      return jsonError("Enter your legal name and check the consent box.");
    }
    if (!signatureData.startsWith("data:image/png;base64,") || signatureData.length > 1500000) {
      return jsonError("Draw your signature again before accepting.");
    }
  }

  const now = new Date().toISOString();
  const payload = {
    quote_id: quoteId,
    user_id: user.id,
    customer_email: customerEmail,
    response_status: responseStatus,
    selected_items: selectedItems,
    accepted_total: responseStatus === "accepted" ? acceptedTotal : null,
    requested_changes: responseStatus === "changes_requested" ? requestedChanges : null,
    signer_name: responseStatus === "accepted" ? signerName : null,
    signature_data: responseStatus === "accepted" ? signatureData : null,
    consented: responseStatus === "accepted" && consented,
    signed_at: responseStatus === "accepted" ? now : null,
    updated_at: now,
    ip_address: (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null,
    user_agent: (request.headers.get("user-agent") || "").slice(0, 1000) || null,
    consent_version: responseStatus === "accepted" ? "2026-08-v1" : null,
    quote_snapshot: {
      id: quote.id,
      title: quote.title,
      customer_email: customerEmail,
      record_date: quote.record_date,
      location: quote.location,
      line_items: lineItems,
      selected_items: selectedItems,
      accepted_total: responseStatus === "accepted" ? acceptedTotal : null,
      captured_at: now,
    },
  };

  const saveResponse = await supabaseRequest("/rest/v1/quote_responses?on_conflict=quote_id,user_id", token, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
  const saved = await saveResponse.json().catch(() => null);
  if (!saveResponse.ok) {
    return jsonError(saved?.message || "This response could not be saved. A signed quote cannot be changed.", 409);
  }

  return NextResponse.json({ response: Array.isArray(saved) ? saved[0] : saved });
}


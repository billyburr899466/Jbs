const SANDBOX_API = "https://api-m.sandbox.paypal.com";
const LIVE_API = "https://api-m.paypal.com";

function envName() {
  return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
}

function apiBase() {
  return envName() === "live" ? LIVE_API : SANDBOX_API;
}

function credentials() {
  return {
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
  };
}

export function getPublicPayPalStatus() {
  const { clientId, clientSecret } = credentials();
  const environment = envName();
  return {
    configured: Boolean(clientId && clientSecret),
    environment,
    sdkUrl:
      environment === "live"
        ? "https://www.paypal.com/web-sdk/v6/core"
        : "https://www.sandbox.paypal.com/web-sdk/v6/core",
  };
}

function assertConfigured() {
  const { clientId, clientSecret } = credentials();
  if (!clientId || !clientSecret) {
    const error = new Error("PayPal business credentials have not been configured yet.");
    error.code = "PAYPAL_NOT_CONFIGURED";
    throw error;
  }
  return { clientId, clientSecret };
}

async function tokenRequest(form) {
  const { clientId, clientSecret } = assertConfigured();
  const auth = Buffer.from(clientId + ":" + clientSecret).toString("base64");

  const response = await fetch(apiBase() + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + auth,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error("PayPal authentication failed.");
    error.code = "PAYPAL_AUTH_FAILED";
    error.status = response.status;
    error.paypal = data;
    throw error;
  }
  return data;
}

export async function getBrowserSafeClientToken(domain) {
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("response_type", "client_token");
  form.set("intent", "sdk_init");
  if (domain) form.append("domains[]", domain);
  return tokenRequest(form);
}

async function getAccessToken() {
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  const data = await tokenRequest(form);
  return data.access_token;
}

function safeText(value, maxLength) {
  return String(value || "")
    .replace(/[<>\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizePaymentInput(input = {}) {
  const rawAmount = String(input.amount ?? "").trim().replace(/[$,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(rawAmount)) {
    throw new Error("Enter a valid payment amount with no more than two decimal places.");
  }

  const numericAmount = Number(rawAmount);
  if (!Number.isFinite(numericAmount) || numericAmount < 1 || numericAmount > 50000) {
    throw new Error("Payment amount must be between $1.00 and $50,000.00.");
  }

  const customerName = safeText(input.customerName, 100);
  const reference = safeText(input.reference, 80);
  const project = safeText(input.project, 120);

  if (customerName.length < 2) throw new Error("Customer name is required.");
  if (reference.length < 2) throw new Error("Quote or invoice number is required.");

  return {
    amount: numericAmount.toFixed(2),
    customerName,
    reference,
    project,
  };
}

async function paypalJson(path, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(apiBase() + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      Accept: "application/json",
      "PayPal-Request-Id": crypto.randomUUID(),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data?.message || data?.details?.[0]?.description || "PayPal could not process this request."
    );
    error.code = "PAYPAL_API_ERROR";
    error.status = response.status;
    error.paypal = data;
    throw error;
  }
  return data;
}

export async function createPayPalOrder(input) {
  const payment = normalizePaymentInput(input);
  const projectSuffix = payment.project ? " - " + payment.project : "";
  const description = safeText(
    "JB's Universal Renovations payment - " + payment.reference + projectSuffix,
    127
  );

  const data = await paypalJson("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: payment.reference,
          custom_id: safeText(payment.customerName + " | " + payment.reference, 127),
          description,
          amount: {
            currency_code: "USD",
            value: payment.amount,
          },
        },
      ],
    }),
  });

  return {
    id: data.id,
    status: data.status,
    amount: payment.amount,
    reference: payment.reference,
  };
}

export async function capturePayPalOrder(orderId) {
  const cleanOrderId = safeText(orderId, 64);
  if (!/^[A-Za-z0-9_-]{5,64}$/.test(cleanOrderId)) {
    throw new Error("Invalid PayPal order ID.");
  }

  const data = await paypalJson(
    "/v2/checkout/orders/" + encodeURIComponent(cleanOrderId) + "/capture",
    { method: "POST", body: "{}" }
  );

  const capture =
    data?.purchase_units?.flatMap((unit) => unit?.payments?.captures || [])[0] || null;

  return {
    orderId: data.id,
    status: data.status,
    captureId: capture?.id || null,
    amount: capture?.amount || null,
    payerName:
      [data?.payer?.name?.given_name, data?.payer?.name?.surname].filter(Boolean).join(" ") || null,
  };
}

export function publicPayPalError(error) {
  if (error?.code === "PAYPAL_NOT_CONFIGURED") {
    return { status: 503, message: "Online payments are being connected to JB's business account." };
  }
  if (error?.code === "PAYPAL_AUTH_FAILED") {
    return { status: 502, message: "PayPal account authentication is not ready yet." };
  }
  if (error?.code === "PAYPAL_API_ERROR") {
    return {
      status: error.status || 502,
      message: error.message || "PayPal could not process the request.",
    };
  }
  return {
    status: 400,
    message: error?.message || "Unable to process this payment request.",
  };
}

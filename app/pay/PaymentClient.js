"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./pay.module.css";

const emptyForm = {
  customerName: "",
  reference: "",
  project: "",
  amount: "",
};

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value || "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(number);
}

export default function PaymentClient() {
  const [form, setForm] = useState(emptyForm);
  const formRef = useRef(form);
  const [setup, setSetup] = useState({
    loading: true,
    configured: false,
    environment: "sandbox",
  });
  const [eligibility, setEligibility] = useState({ paypal: false, venmo: false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const selectedMethodRef = useRef("PayPal");
  const cleanupRef = useRef(() => {});

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const statusResponse = await fetch("/api/paypal/status", { cache: "no-store" });
        const status = await statusResponse.json();
        if (cancelled) return;

        setSetup({ loading: false, ...status });
        if (!status.configured) return;

        setMessage("Loading secure payment options...");

        const tokenResponse = await fetch("/api/paypal/client-token", { cache: "no-store" });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
          throw new Error(tokenData.error || "Unable to initialize secure checkout.");
        }

        await loadPayPalSdk(tokenData.sdkUrl);
        if (cancelled) return;

        const clientMetadataId =
          globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : "jbs-" + Date.now() + "-" + Math.random().toString(16).slice(2);

        const sdk = await window.paypal.createInstance({
          clientToken: tokenData.accessToken,
          components: ["paypal-payments", "venmo-payments"],
          pageType: "checkout",
          locale: "en-US",
          clientMetadataId,
        });

        const methods = await sdk.findEligibleMethods({ currencyCode: "USD" });
        const paypalEligible = methods.isEligible("paypal");
        const venmoEligible = methods.isEligible("venmo");

        setEligibility({ paypal: paypalEligible, venmo: venmoEligible });

        const onApprove = async ({ orderId }) => {
          setMessage("Payment approved. Recording your receipt...");
          setError("");

          const response = await fetch(
            "/api/paypal/capture-order/" + encodeURIComponent(orderId),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }
          );
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "The payment was approved but could not be captured."
            );
          }

          setReceipt({
            ...data,
            method: selectedMethodRef.current,
            customerName: formRef.current.customerName,
            reference: formRef.current.reference,
            project: formRef.current.project,
          });
          setMessage("Payment complete. Your receipt is below.");
        };

        const commonOptions = {
          onApprove,
          onCancel: () => {
            setMessage("Payment cancelled. No payment was completed.");
            setError("");
          },
          onError: (paymentError) => {
            console.error("PayPal checkout error", paymentError);
            setMessage("");
            setError(
              "The payment window could not complete the transaction. Please try again."
            );
          },
        };

        const paypalSession = paypalEligible
          ? sdk.createPayPalOneTimePaymentSession(commonOptions)
          : null;
        const venmoSession = venmoEligible
          ? sdk.createVenmoOneTimePaymentSession(commonOptions)
          : null;

        const paypalButton = document.getElementById("jbs-paypal-button");
        const venmoButton = document.getElementById("jbs-venmo-button");

        async function startPayment(method, session) {
          if (!session) return;

          const current = formRef.current;
          const validationError = validate(current);
          if (validationError) {
            setError(validationError);
            setMessage("");
            return;
          }

          selectedMethodRef.current = method;
          setError("");
          setReceipt(null);
          setMessage("Opening secure " + method + " checkout...");

          try {
            await session.start(
              { presentationMode: "auto" },
              createOrder(current)
            );
          } catch (paymentError) {
            console.error(method + " start error", paymentError);
            setMessage("");
            setError(
              paymentError?.message || "Unable to start " + method + " checkout."
            );
          }
        }

        const onPayPal = () => startPayment("PayPal", paypalSession);
        const onVenmo = () => startPayment("Venmo", venmoSession);

        paypalButton?.addEventListener("click", onPayPal);
        venmoButton?.addEventListener("click", onVenmo);

        cleanupRef.current = () => {
          paypalButton?.removeEventListener("click", onPayPal);
          venmoButton?.removeEventListener("click", onVenmo);
        };

        setMessage(
          paypalEligible || venmoEligible
            ? ""
            : "PayPal did not return an eligible payment method for this browser."
        );
      } catch (bootError) {
        console.error("Payment setup error", bootError);
        if (!cancelled) {
          setSetup((current) => ({ ...current, loading: false }));
          setMessage("");
          setError(
            bootError?.message || "Online checkout is temporarily unavailable."
          );
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
      cleanupRef.current();
    };
  }, []);

  function update(field) {
    return (event) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
      setError("");
    };
  }

  const fieldFull = [styles.field, styles.full].join(" ");

  return (
    <>
      <form className={styles.grid} onSubmit={(event) => event.preventDefault()}>
        <div className={styles.field}>
          <label htmlFor="customerName">Customer name</label>
          <input
            id="customerName"
            autoComplete="name"
            value={form.customerName}
            onChange={update("customerName")}
            placeholder="Customer name"
            maxLength={100}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="reference">Quote / invoice number</label>
          <input
            id="reference"
            value={form.reference}
            onChange={update("reference")}
            placeholder="Example: JBS-2026-0927"
            maxLength={80}
          />
        </div>

        <div className={fieldFull}>
          <label htmlFor="project">
            Project or address reference{" "}
            <span className={styles.help}>(optional)</span>
          </label>
          <input
            id="project"
            value={form.project}
            onChange={update("project")}
            placeholder="Example: Basement renovation"
            maxLength={120}
          />
        </div>

        <div className={fieldFull}>
          <label htmlFor="amount">Payment amount</label>
          <input
            id="amount"
            inputMode="decimal"
            value={form.amount}
            onChange={update("amount")}
            placeholder="4075.00"
            aria-describedby="amount-help"
          />
          <span id="amount-help" className={styles.help}>
            Enter the exact deposit, progress payment, or balance shown on your JB's quote
            or invoice.
          </span>
        </div>
      </form>

      <hr className={styles.divider} />

      <h2 className={styles.paymentTitle}>Choose how you want to pay</h2>
      <p className={styles.paymentText}>
        PayPal and Venmo are processed securely by PayPal. Venmo appears only when it
        is eligible for the customer, device, and account.
      </p>

      {setup.loading ? (
        <p className={styles.loading} aria-live="polite">
          Checking secure payment setup...
        </p>
      ) : !setup.configured ? (
        <div className={styles.notice}>
          <strong>Payment page is built and ready for the business account.</strong>
          <br />
          JB's is finishing the PayPal/Venmo business connection. The payment buttons
          will activate after the business API credentials are added.
        </div>
      ) : (
        <div className={styles.paymentButtons}>
          <paypal-button
            id="jbs-paypal-button"
            type="pay"
            hidden={!eligibility.paypal}
          ></paypal-button>
          <venmo-button
            id="jbs-venmo-button"
            type="pay"
            hidden={!eligibility.venmo}
          ></venmo-button>
        </div>
      )}

      {setup.configured && !eligibility.venmo && !setup.loading ? (
        <p className={styles.help}>
          Venmo may not display on every browser. PayPal determines Venmo eligibility
          based on factors such as U.S. location, device, account, and USD payment eligibility.
        </p>
      ) : null}

      {message ? (
        <div className={styles.notice} aria-live="polite">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      {receipt ? (
        <div className={styles.receipt} id="payment-receipt">
          <h3>JB's Universal Renovations - Payment Receipt</h3>
          <dl>
            <dt>Customer</dt>
            <dd>{receipt.customerName}</dd>

            <dt>Quote / invoice</dt>
            <dd>{receipt.reference}</dd>

            {receipt.project ? (
              <>
                <dt>Project</dt>
                <dd>{receipt.project}</dd>
              </>
            ) : null}

            <dt>Payment method</dt>
            <dd>{receipt.method}</dd>

            <dt>Amount paid</dt>
            <dd>{money(receipt.amount?.value)}</dd>

            <dt>Status</dt>
            <dd>{receipt.status}</dd>

            <dt>PayPal order ID</dt>
            <dd>{receipt.orderId}</dd>

            <dt>Transaction ID</dt>
            <dd>{receipt.captureId || "Pending receipt ID"}</dd>
          </dl>

          <button
            className={styles.print}
            type="button"
            onClick={() => window.print()}
          >
            Print / Save Receipt
          </button>
        </div>
      ) : null}
    </>
  );
}

function validate(form) {
  if (form.customerName.trim().length < 2) return "Enter the customer name.";
  if (form.reference.trim().length < 2) {
    return "Enter the JB's quote or invoice number.";
  }

  const amount = form.amount.trim().replace(/[$,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) return "Enter a valid payment amount.";

  const numericAmount = Number(amount);
  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < 1 ||
    numericAmount > 50000
  ) {
    return "Payment amount must be between $1.00 and $50,000.00.";
  }

  return "";
}

async function createOrder(form) {
  const response = await fetch("/api/paypal/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const data = await response.json();

  if (!response.ok || !data.id) {
    throw new Error(data.error || "Unable to create a secure payment order.");
  }

  return { orderId: data.id };
}

function loadPayPalSdk(src) {
  if (window.paypal?.createInstance) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-jbs-paypal-sdk]");

    if (existing) {
      if (window.paypal?.createInstance) {
        resolve();
        return;
      }

      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Unable to load PayPal secure checkout.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.jbsPaypalSdk = "true";
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Unable to load PayPal secure checkout."));
    document.head.appendChild(script);
  });
}

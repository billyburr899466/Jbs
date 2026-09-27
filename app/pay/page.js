import Image from "next/image";
import PaymentClient from "./PaymentClient";
import styles from "./pay.module.css";

export const metadata = {
  title: "Make a Payment | JB's Universal Renovations",
  description: "Securely make a project payment to JB's Universal Renovations using PayPal or eligible Venmo checkout.",
};

export default function PayPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Image
            className={styles.logo}
            src="/icon.svg"
            width={62}
            height={62}
            alt="JB's Universal Renovations"
          />
          <div>
            <h2 className={styles.brand}>JB's Universal Renovations LLC</h2>
            <p className={styles.tagline}>Built Tough. Fixed Right. Made to Last.</p>
          </div>
          <a className={styles.back} href="/portal">Customer Portal</a>
        </header>

        <section className={styles.intro}>
          <p className={styles.eyebrow}>Secure Project Payments</p>
          <h1>Make a Payment</h1>
          <p>
            Use this page for a deposit, progress payment, or final balance listed on your JB's
            quote or invoice. Enter your project information first, then choose an available
            secure payment option.
          </p>
        </section>

        <section className={styles.card}>
          <PaymentClient />
          <div className={styles.secure}>
            <span aria-hidden="true">🔒</span>
            <span>
              <strong>Secure checkout:</strong> PayPal processes the transaction. JB's does not
              receive or store your PayPal or Venmo login credentials.
            </span>
          </div>
        </section>

        <footer className={styles.footer}>
          © {new Date().getFullYear()} JB's Universal Renovations LLC · Elkhart, Indiana
        </footer>
      </div>
    </main>
  );
}

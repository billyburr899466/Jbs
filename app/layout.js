export const metadata = {
  title: "JB's Universal Renovations",
  description: "Quotes, projects, signatures, and direct customer communication.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


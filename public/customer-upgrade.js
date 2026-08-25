const SOURCE = "https://jbs-universal-renovations-lfo67nhva-billyburr89-9570s-projects.vercel.app";

try {
  await import(`${SOURCE}/customer-upgrade.js`);
  await import("./recovery-patch.js");
} catch (error) {
  console.error("[JBs recovery] Customer upgrade failed to load", error);
  const existing = document.querySelector(".jbs-recovery-error");
  if (!existing) {
    const note = document.createElement("div");
    note.className = "jbs-recovery-error";
    note.innerHTML = "<b>JB's app recovery mode</b><span>The customer upgrade could not finish loading. Reload the app once.</span><button type='button'>Reload</button>";
    note.querySelector("button")?.addEventListener("click", () => location.reload());
    document.body.append(note);
  }
}

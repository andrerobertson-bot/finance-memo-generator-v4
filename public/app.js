const statusEl = document.getElementById("status");
const btnGenerate = document.getElementById("btnGenerate");
const btnVersion = document.getElementById("btnVersion");

function setStatus(msg) {
  statusEl.textContent = msg;
}

function val(id) {
  return document.getElementById(id).value;
}

function file(id) {
  const el = document.getElementById(id);
  return el.files && el.files[0] ? el.files[0] : null;
}

btnVersion.addEventListener("click", async () => {
  try {
    setStatus("Fetching /version...");
    const r = await fetch("/version");
    const j = await r.json();
    setStatus(JSON.stringify(j, null, 2));
  } catch (e) {
    setStatus("Version failed: " + (e?.message || String(e)));
  }
});

btnGenerate.addEventListener("click", async () => {
  try {
    setStatus("Generating PDF...");

    const fd = new FormData();
    fd.append("mainTitle", val("mainTitle"));
    fd.append("subOne", val("subOne"));
    fd.append("subTwo", val("subTwo"));
    fd.append("headline", val("headline"));
    fd.append("projectName", val("projectName"));
    fd.append("loanAmount", val("loanAmount"));
    fd.append("dateText", val("dateText"));
    fd.append("referenceNumber", val("referenceNumber"));
    fd.append("companyLine", val("companyLine"));
    fd.append("footerLine", val("footerLine"));

    const cover = file("coverImage");
    const footer = file("footerLogo");
    if (cover) fd.append("coverImage", cover);
    if (footer) fd.append("footerLogo", footer);

    const resp = await fetch("/api/generate", { method: "POST", body: fd });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text);
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-memorandum.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setStatus("PDF generated and downloaded.");
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (e) {
    setStatus("Generate failed:\n" + (e?.message || String(e)));
  }
});

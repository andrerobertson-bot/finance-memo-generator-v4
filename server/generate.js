import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toDataUrlFromFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp" ? "image/webp" :
    "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function buildFontCss(fontDirPath) {
  const defs = [
    { file: "Raleway-Regular.ttf", family: "Raleway", weight: 400, style: "normal" },
    { file: "Raleway-Medium.ttf", family: "Raleway", weight: 500, style: "normal" },
    { file: "Raleway-SemiBold.ttf", family: "Raleway", weight: 600, style: "normal" },
    { file: "Raleway-Bold.ttf", family: "Raleway", weight: 700, style: "normal" },
    { file: "Merriweather-Regular.ttf", family: "Merriweather", weight: 400, style: "normal" },
    { file: "Merriweather-Black.ttf", family: "Merriweather", weight: 900, style: "normal" },
    { file: "Merriweather-BlackItalic.ttf", family: "Merriweather", weight: 900, style: "italic" },
  ];

  return defs.map((d) => {
    const fp = path.join(fontDirPath, d.file);
    const b64 = fs.readFileSync(fp).toString("base64");
    return `
@font-face{
  font-family:${JSON.stringify(d.family)};
  src:url("data:font/ttf;base64,${b64}") format("truetype");
  font-weight:${d.weight};
  font-style:${d.style};
  font-display:swap;
}`.trim();
  }).join("\n");
}

function normalizeInput(payload) {
  // Accept both {fields, files} and flat body
  const fields = payload?.fields ? payload.fields : payload;
  const files = payload?.files ? payload.files : (payload?.files ?? {});
  return { fields: fields || {}, files: files || {} };
}

function formatMoney(v) {
  if (!v) return "";
  // assume already formatted if includes $ or commas
  if (typeof v === "string" && /\$|,/.test(v)) return v;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  if (!isFinite(n)) return String(v);
  return "$" + n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

export async function generatePdf(payload) {
  const { fields, files } = normalizeInput(payload);

  const projectName = fields.projectName || fields.borrowerName || "Project Name";
  const loanAmount = formatMoney(fields.loanAmount || fields.loanAmountText || "$0");
  const referenceNumber = fields.referenceNumber || "REF-0001";
  const companyLine = fields.companyLine || "Connect FG Pty Ltd";
  const dateText = fields.dateText || fields.date || "";

  const mainTitle = fields.mainTitle || "Connect Financial Group";
  const confidentialLine = fields.confidentialLine || "Confidential";
  const financeMemoLine = fields.financeMemoLine || "Finance Memorandum";
  const constructionLine = fields.constructionLine || "Construction Finance";
  const referenceLine = fields.referenceLine || `Our Reference Number: ${referenceNumber}`;

  const fontCss = buildFontCss(path.join(__dirname, "..", "public", "fonts"));

  // Background: prefer uploaded coverImage if present, else default public/page1-cover.png
  let coverBgDataUrl = "";
  const coverFile = (files.coverImage && files.coverImage[0]) || (files.coverPhoto && files.coverPhoto[0]) || null;
  if (coverFile?.buffer) {
    const mime = coverFile.mimetype || "image/png";
    coverBgDataUrl = `data:${mime};base64,${coverFile.buffer.toString("base64")}`;
  } else {
    coverBgDataUrl = toDataUrlFromFile(path.join(__dirname, "..", "public", "page1-cover.png"));
  }

  const coverTpl = fs.readFileSync(path.join(__dirname, "..", "templates", "cover.html"), "utf8");
  const coverHtml = coverTpl
    .replaceAll("{{FONT_CSS}}", fontCss)
    .replaceAll("{{COVER_BG}}", coverBgDataUrl)
    .replaceAll("{{mainTitle}}", escapeHtml(mainTitle))
    .replaceAll("{{confidentialLine}}", escapeHtml(confidentialLine))
    .replaceAll("{{financeMemoLine}}", escapeHtml(financeMemoLine))
    .replaceAll("{{constructionLine}}", escapeHtml(constructionLine))
    .replaceAll("{{projectName}}", escapeHtml(projectName))
    .replaceAll("{{loanAmount}}", escapeHtml(loanAmount))
    .replaceAll("{{dateText}}", escapeHtml(dateText))
    .replaceAll("{{referenceLine}}", escapeHtml(referenceLine))
    .replaceAll("{{companyLine}}", escapeHtml(companyLine))
    .replaceAll("{%FOOTER%}", ""); // optional footer off by default

  const docTpl = fs.readFileSync(path.join(__dirname, "..", "templates", "document.html"), "utf8");
  const html = docTpl.replaceAll("{{COVER_HTML}}", coverHtml);

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } }); // ~A4 at 96dpi
  await page.setContent(html, { waitUntil: "load" });

  // Ensure fonts loaded (prevents per-glyph fallback / mixed-font look)
  await page.evaluate(async () => {
    try { await document.fonts.ready; } catch (e) {}
  });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });

  await browser.close();
  return pdf;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

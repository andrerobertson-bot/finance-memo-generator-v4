import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildFontCss(fontDirPath) {
  // Embed TTF fonts as data URLs so Playwright setContent renders identically in any environment.
  const defs = [
    { file: "Raleway-Regular.ttf", family: "Raleway", weight: 400, style: "normal" },
    { file: "Raleway-Medium.ttf", family: "Raleway", weight: 500, style: "normal" },
    { file: "Raleway-SemiBold.ttf", family: "Raleway", weight: 600, style: "normal" },
    { file: "Raleway-Bold.ttf", family: "Raleway", weight: 700, style: "normal" },
    { file: "Merriweather-Regular.ttf", family: "Merriweather", weight: 400, style: "normal" },
    { file: "Merriweather-Black.ttf", family: "Merriweather", weight: 900, style: "normal" },
    { file: "Merriweather-BlackItalic.ttf", family: "Merriweather", weight: 900, style: "italic" },
  ];

  let css = "";
  for (const d of defs) {
    const p = path.join(fontDirPath, d.file);
    if (!fs.existsSync(p)) continue;
    const buf = fs.readFileSync(p);
    const b64 = buf.toString("base64");
    css += `@font-face{font-family:'${d.family}';src:url(data:font/ttf;base64,${b64}) format('truetype');font-weight:${d.weight};font-style:${d.style};}
`;
  }
  return css;
}

function mustReadText(filePath) {
  if (!fs.existsSync(filePath)) {
    const rel = path.relative(path.join(__dirname, ".."), filePath);
    throw new Error(`Required file missing: ${rel}. Did you delete or forget to upload it?`);
  }
  return fs.readFileSync(filePath, "utf8");
}

export async function generatePdf(input) {
  // Support both legacy call styles:
  //  - generatePdf(fields)
  //  - generatePdf({ fields, files })
  const fields = (input && input.fields) ? input.fields : (input || {});
  const files = (input && input.files) ? input.files : [];

  const templatesDir = path.join(__dirname, "..", "templates");
  const docTemplatePath = path.join(templatesDir, "document.html");
  const coverSvgPath = path.join(templatesDir, "page1-cover.svg");

  const htmlTemplate = mustReadText(docTemplatePath);
  const fontCss = buildFontCss(path.join(__dirname, "..", "public", "fonts"));
  let coverSvg = mustReadText(coverSvgPath);

  const escapeXml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  // Helper: turn an uploaded file (multer) into a data URL
  // Works with both memoryStorage (buffer) and diskStorage (path)
  const fileToDataUrl = (f) => {
    if (!f) return "";
    let buf = null;

    if (f.buffer && Buffer.isBuffer(f.buffer)) {
      buf = f.buffer;
    } else if (f.path && fs.existsSync(f.path)) {
      buf = fs.readFileSync(f.path);
    }

    if (!buf) return "";
    const mime = f.mimetype || "application/octet-stream";
    return `data:${mime};base64,${buf.toString("base64")}`;
  };

  // Inputs from UI (public/app.js)
  const values = {
    mainTitle: fields.mainTitle || "Global Capital Commercial",
    subOne: fields.subOne || "Confidential",
    subTwo: fields.subTwo || "Finance Memorandum",
    headline: fields.headline || "Construction Finance",
    projectName: fields.projectName || "",
    loanAmount: fields.loanAmount || "",
    dateText: fields.dateText || "",
    referenceNumber: fields.referenceNumber || "",
    companyLine: fields.companyLine || (fields.projectName ? "" : ""), // keep blank unless provided
    footerLine: fields.footerLine || "Confidential — For intended recipient only",
  };

  // Optional uploads
  const coverUpload = files.find((f) => f.fieldname === "coverImage");
  const footerLogoUpload = files.find((f) => f.fieldname === "footerLogo");

  // Default cover image (repo asset) if user doesn't upload one
  const defaultCoverPath = path.join(__dirname, "..", "public", "page1-cover.png");
  const defaultCoverDataUrl = fs.existsSync(defaultCoverPath)
    ? `data:image/png;base64,${fs.readFileSync(defaultCoverPath).toString("base64")}`
    : "";

  const coverImageUrl = coverUpload ? fileToDataUrl(coverUpload) : defaultCoverDataUrl;

  // If footer logo not uploaded, leave empty (hide <img> via template logic)
  const footerLogoUrl = footerLogoUpload ? fileToDataUrl(footerLogoUpload) : "";

  // Inject values into the COVER SVG
  coverSvg = coverSvg
    .replaceAll("{{COVER_IMAGE_URL}}", coverImageUrl)
    .replaceAll("{{mainTitle}}", escapeXml(values.mainTitle))
    .replaceAll("{{subOne}}", escapeXml(values.subOne))
    .replaceAll("{{subTwo}}", escapeXml(values.subTwo))
    .replaceAll("{{headline}}", escapeXml(values.headline))
    .replaceAll("{{projectName}}", escapeXml(values.projectName))
    .replaceAll("{{loanAmount}}", escapeXml(values.loanAmount))
    .replaceAll("{{dateText}}", escapeXml(values.dateText))
    .replaceAll("{{referenceNumber}}", escapeXml(values.referenceNumber))
    .replaceAll("{{companyLine}}", escapeXml(values.companyLine));

  // Build page 2 (placeholder for now)
  const page2Html = `
    <h1>${escapeXml(values.projectName || "Project")}</h1>
    <p><b>Loan Amount:</b> ${escapeXml(values.loanAmount || "")}</p>
    <p><b>Reference:</b> ${escapeXml(values.referenceNumber || "")}</p>
  `;

  // Inject into HTML template
  const html = htmlTemplate.replaceAll("{{FONT_CSS}}", fontCss)
    .replaceAll("{{COVER_SVG}}", coverSvg)
    .replaceAll("{{PAGE2_HTML}}", page2Html)
    .replaceAll("{{FOOTER_LINE}}", escapeXml(values.footerLine))
    .replaceAll("{{FOOTER_LOGO_URL}}", footerLogoUrl || "data:image/gif;base64,R0lGODlhAQABAAAAACw=");

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
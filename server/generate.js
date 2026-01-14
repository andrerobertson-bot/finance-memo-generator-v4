import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function mustReadText(filePath) {
  if (!fs.existsSync(filePath)) {
    const rel = path.relative(path.join(__dirname, ".."), filePath);
    throw new Error(`Required file missing: ${rel}. Did you delete or forget to upload it?`);
  }
  return fs.readFileSync(filePath, "utf8");
}

export async function generatePdf(form) {
  const templatesDir = path.join(__dirname, "..", "templates");
  const docTemplatePath = path.join(templatesDir, "document.html");
  const coverSvgPath = path.join(templatesDir, "page1-cover.svg");

  const htmlTemplate = mustReadText(docTemplatePath);
  const coverSvg = mustReadText(coverSvgPath);

  const values = {
    projectName: form.projectName || "",
    loanAmount: form.loanAmount || "",
    referenceNumber: form.referenceNumber || "",
  };

  const html = htmlTemplate
    .replaceAll("{{COVER_SVG}}", coverSvg)
    .replaceAll("{{projectName}}", values.projectName)
    .replaceAll("{{loanAmount}}", values.loanAmount)
    .replaceAll("{{referenceNumber}}", values.referenceNumber);

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

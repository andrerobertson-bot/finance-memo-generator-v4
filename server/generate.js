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


function toDataUrl(filePath, mime) {
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export async function generatePdf(form) {
  const templatesDir = path.join(__dirname, "..", "templates");
  const docTemplatePath = path.join(templatesDir, "document.html");
  const coverSvgPath = path.join(templatesDir, "page1-cover.svg");

  const htmlTemplate = mustReadText(docTemplatePath);
  const coverSvg = mustReadText(coverSvgPath);


  // Embed cover background image + fonts as data URLs so Playwright can render via page.setContent()
  const coverImagePath = path.join(__dirname, "..", "public", "page1-cover.png");
  const coverImageDataUrl = toDataUrl(coverImagePath, "image/png");

  const fontDir = path.join(__dirname, "..", "public", "fonts");
  const fontData = {
    'Raleway-Regular': toDataUrl(path.join(fontDir, 'Raleway-Regular.ttf'), 'font/ttf'),
    'Raleway-Medium': toDataUrl(path.join(fontDir, 'Raleway-Medium.ttf'), 'font/ttf'),
    'Raleway-SemiBold': toDataUrl(path.join(fontDir, 'Raleway-SemiBold.ttf'), 'font/ttf'),
    'Raleway-Bold': toDataUrl(path.join(fontDir, 'Raleway-Bold.ttf'), 'font/ttf'),
    'Merriweather-Regular': toDataUrl(path.join(fontDir, 'Merriweather-Regular.ttf'), 'font/ttf'),
    'Merriweather-Black': toDataUrl(path.join(fontDir, 'Merriweather-Black.ttf'), 'font/ttf'),
    'Merriweather-BlackItalic': toDataUrl(path.join(fontDir, 'Merriweather-BlackItalic.ttf'), 'font/ttf'),
  };

  const values = {
    projectName: form.projectName || "",
    loanAmount: form.loanAmount || "",
    referenceNumber: form.referenceNumber || "",
  };

  
  // Inject embedded assets into the SVG + CSS
  const coverSvgWithAssets = coverSvg.replaceAll('{{COVER_IMAGE_URL}}', coverImageDataUrl);

  // Inline font files (data URLs) into @font-face rules
  let htmlWithFonts = htmlTemplate;
  htmlWithFonts = htmlWithFonts.replaceAll("url('/fonts/Raleway-Regular.ttf')", `url(${fontData['Raleway-Regular']})`);
  htmlWithFonts = htmlWithFonts.replaceAll("url('/fonts/Raleway-Medium.ttf')", `url(${fontData['Raleway-Medium']})`);
  htmlWithFonts = htmlWithFonts.replaceAll("url('/fonts/Raleway-SemiBold.ttf')", `url(${fontData['Raleway-SemiBold']})`);
  htmlWithFonts = htmlWithFonts.replaceAll("url('/fonts/Raleway-Bold.ttf')", `url(${fontData['Raleway-Bold']})`);
  htmlWithFonts = htmlWithFonts.replaceAll("url('/fonts/Merriweather-Regular.ttf')", `url(${fontData['Merriweather-Regular']})`);
  htmlWithFonts = htmlWithFonts.replaceAll("url('/fonts/Merriweather-Black.ttf')", `url(${fontData['Merriweather-Black']})`);
  htmlWithFonts = htmlWithFonts.replaceAll("url('/fonts/Merriweather-BlackItalic.ttf')", `url(${fontData['Merriweather-BlackItalic']})`);
const html = htmlWithFonts
    .replaceAll("{{COVER_SVG}}", coverSvgWithAssets)
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

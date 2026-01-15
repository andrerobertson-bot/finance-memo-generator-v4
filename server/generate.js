
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

function loadFontBytes(name) {
  return fs.readFileSync(path.join(__dirname, "../templates/fonts", name));
}

function whiteRect(page, x, y, w, h, pad = 2) {
  // Padding matters: if we don't fully cover the original glyphs,
  // you can get "double-print" artifacts (e.g., a single digit looking bolder).
  page.drawRectangle({
    x: x - pad,
    y: y - pad,
    width: w + (pad * 2),
    height: h + (pad * 2),
    color: rgb(1, 1, 1),
    borderColor: rgb(1, 1, 1),
  });
}

function drawTextFitted(page, text, cfg, font, baseSize, color = rgb(0,0,0)) {
  const maxW = cfg.w;
  let size = baseSize;
  // Shrink until fits (simple + robust)
  while (size > 6 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.5;
  page.drawText(text, { x: cfg.x, y: cfg.y, size, font, color });
}

async function generatePdf(fields) {
  const refPath = path.join(__dirname, "../templates/reference.pdf");
  const existingPdfBytes = fs.readFileSync(refPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const map = JSON.parse(fs.readFileSync(path.join(__dirname, "../templates/cover-map.json"), "utf8"));
  const cfg = map.fields;
  const page = pdfDoc.getPage(0);

  // Embed fonts used for overlays (ensure glyph coverage for all dynamic fields)
  const ralewayReg = await pdfDoc.embedFont(loadFontBytes("Raleway-Regular.ttf"), { subset: false });
  const ralewayMed = await pdfDoc.embedFont(loadFontBytes("Raleway-Medium.ttf"), { subset: false });
  const ralewaySemi = await pdfDoc.embedFont(loadFontBytes("Raleway-SemiBold.ttf"), { subset: false });
  // Roboto has clean, consistent lining numerals (avoids the "big 5" look)
  // and works well for financial figures without needing OpenType feature toggles.
  const robotoMed = await pdfDoc.embedFont(loadFontBytes("Roboto-Medium.ttf"), { subset: false });
  const merriReg = await pdfDoc.embedFont(loadFontBytes("Merriweather-Regular.ttf"), { subset: false });
  const merriBlackIt = await pdfDoc.embedFont(loadFontBytes("Merriweather-BlackItalic.ttf"), { subset: false });
  const merriBlack = await pdfDoc.embedFont(loadFontBytes("Merriweather-Black.ttf"), { subset: false });

  // Replace company name (top line)
  if (fields.companyName) {
    whiteRect(page, cfg.companyName.x, cfg.companyName.y, cfg.companyName.w, cfg.companyName.h);
    // Reference masthead is serif; use full Merriweather program to match weight/feel.
    // Keep size conservative; drawTextFitted will shrink to fit.
    // Slightly smaller to match the reference hierarchy.
    drawTextFitted(page, fields.companyName, cfg.companyName, merriReg, 28, rgb(0,0,0));
  }

  // Project Name
  if (fields.projectName) {
    whiteRect(page, cfg.projectName.x, cfg.projectName.y, cfg.projectName.w, cfg.projectName.h);
    // Reference shows this line in black (not grey)
    drawTextFitted(page, fields.projectName, cfg.projectName, ralewayReg, 20, rgb(0,0,0));
  }

  // Loan Amount (keep light gray like reference)
  if (fields.loanAmount) {
    // Use extra padding here to ensure we fully erase the original "$50,000,000"
    // (otherwise you can get a "fatter" digit where the old glyph peeks through).
    whiteRect(page, cfg.loanAmount.x, cfg.loanAmount.y, cfg.loanAmount.w, cfg.loanAmount.h, 10);
    drawTextFitted(page, fields.loanAmount, cfg.loanAmount, robotoMed, 28, rgb(0.70,0.72,0.74));
  }

  // Date
  if (fields.dateText) {
    whiteRect(page, cfg.dateText.x, cfg.dateText.y, cfg.dateText.w, cfg.dateText.h);
    // Sits under reference line (new field)
    // Always prefix with "Date:" so the field can't accidentally be "stuck" to the reference.
    const dateLine = fields.dateText.trim().toLowerCase().startsWith('date:')
      ? fields.dateText.trim()
      : `Date: ${fields.dateText.trim()}`;
    drawTextFitted(page, dateLine, cfg.dateText, robotoMed, 11, rgb(0.25,0.25,0.25));
  }

  // Reference Number (line)
  if (fields.referenceNumber) {
    whiteRect(page, cfg.referenceLine.x, cfg.referenceLine.y, cfg.referenceLine.w, cfg.referenceLine.h);
    const refLine = `Our Reference Number: ${fields.referenceNumber}`;
    drawTextFitted(page, refLine, cfg.referenceLine, robotoMed, 11, rgb(0.25,0.25,0.25));
  }

  // Company line (optional override of footer lines)
  // If user provides website/footerLine1/footerLine2, replace them; otherwise keep reference.
  if (fields.websiteLine) {
    whiteRect(page, cfg.websiteLine.x, cfg.websiteLine.y, cfg.websiteLine.w, cfg.websiteLine.h);
    drawTextFitted(page, fields.websiteLine, cfg.websiteLine, ralewayReg, 9, rgb(0.0,0.62,0.71));
  }
  if (fields.footerLine1) {
    whiteRect(page, cfg.footerLine1.x, cfg.footerLine1.y, cfg.footerLine1.w, cfg.footerLine1.h);
    drawTextFitted(page, fields.footerLine1, cfg.footerLine1, ralewayReg, 8.2, rgb(0.25,0.25,0.25));
  }
  if (fields.footerLine2) {
    whiteRect(page, cfg.footerLine2.x, cfg.footerLine2.y, cfg.footerLine2.w, cfg.footerLine2.h);
    drawTextFitted(page, fields.footerLine2, cfg.footerLine2, ralewayReg, 8.2, rgb(0.25,0.25,0.25));
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generatePdf };
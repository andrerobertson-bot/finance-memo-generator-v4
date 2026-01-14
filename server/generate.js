
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

function loadFontBytes(name) {
  return fs.readFileSync(path.join(__dirname, "../templates/fonts", name));
}

function whiteRect(page, x, y, w, h) {
  // Slight padding to fully cover old glyphs
  page.drawRectangle({
    x: x - 2,
    y: y - 2,
    width: w + 4,
    height: h + 4,
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

  // Embed exact fonts extracted from the reference PDF
  const ralewayReg = await pdfDoc.embedFont(loadFontBytes("Raleway-Regular.ttf"));
  const ralewayMed = await pdfDoc.embedFont(loadFontBytes("Raleway-Medium.ttf"));
  const ralewaySemi = await pdfDoc.embedFont(loadFontBytes("Raleway-SemiBold.ttf"));
  const merriReg = await pdfDoc.embedFont(loadFontBytes("Merriweather-Regular.ttf"));
  const merriBlackIt = await pdfDoc.embedFont(loadFontBytes("Merriweather-BlackItalic.ttf"));
  const merriBlack = await pdfDoc.embedFont(loadFontBytes("Merriweather-Black.ttf"));

  // Replace company name (top line)
  if (fields.companyName) {
    whiteRect(page, cfg.companyName.x, cfg.companyName.y, cfg.companyName.w, cfg.companyName.h);
    drawTextFitted(page, fields.companyName, cfg.companyName, merriReg, 48);
  }

  // Project Name
  if (fields.projectName) {
    whiteRect(page, cfg.projectName.x, cfg.projectName.y, cfg.projectName.w, cfg.projectName.h);
    drawTextFitted(page, fields.projectName, cfg.projectName, ralewayReg, 26, rgb(0.20,0.20,0.20));
  }

  // Loan Amount (keep light gray like reference)
  if (fields.loanAmount) {
    whiteRect(page, cfg.loanAmount.x, cfg.loanAmount.y, cfg.loanAmount.w, cfg.loanAmount.h);
    drawTextFitted(page, fields.loanAmount, cfg.loanAmount, ralewayMed, 28, rgb(0.70,0.72,0.74));
  }

  // Date
  if (fields.dateText) {
    whiteRect(page, cfg.dateText.x, cfg.dateText.y, cfg.dateText.w, cfg.dateText.h);
    drawTextFitted(page, fields.dateText, cfg.dateText, ralewayReg, 10, rgb(0.35,0.35,0.35));
  }

  // Reference Number (line)
  if (fields.referenceNumber) {
    whiteRect(page, cfg.referenceLine.x, cfg.referenceLine.y, cfg.referenceLine.w, cfg.referenceLine.h);
    const refLine = `Our Reference Number: ${fields.referenceNumber}`;
    drawTextFitted(page, refLine, cfg.referenceLine, ralewayReg, 11, rgb(0.25,0.25,0.25));
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

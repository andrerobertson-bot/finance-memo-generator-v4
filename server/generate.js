
const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

async function generatePdf(fields) {
  const refPath = path.join(__dirname, "../templates/reference.pdf");
  const existingPdfBytes = fs.readFileSync(refPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const page = pdfDoc.getPage(0);
  const coverMap = JSON.parse(fs.readFileSync(path.join(__dirname, "../templates/cover-map.json")));

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const key in coverMap) {
    const cfg = coverMap[key];
    const value = fields[key] || "";
    page.drawText(String(value), {
      x: cfg.x,
      y: cfg.y,
      size: cfg.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generatePdf };

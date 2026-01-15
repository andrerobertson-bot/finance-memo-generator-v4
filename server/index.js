
const path = require("path");
const express = require("express");
const multer = require("multer");
const { generatePdf } = require("./generate");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Accept both JSON and multipart form data
app.post("/api/generate", upload.none(), express.json(), async (req, res) => {
  try {
    const body = req.body || {};
    const pdfBuffer = await generatePdf(body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=finance-memo.pdf");
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

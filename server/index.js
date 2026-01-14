import express from "express";
import helmet from "helmet";
import compression from "compression";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { generatePdf } from "./generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: "2mb" }));

// UI
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

// If the user accidentally removes public/index.html, keep `/` working with a minimal fallback.
app.get("/", (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);

  res.status(200).type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Finance Memo Generator</title></head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px;">
  <h1>Finance Memo Generator</h1>
  <p><b>UI missing:</b> <code>public/index.html</code> was not found in this deployment.</p>
  <p>Fix: restore the <code>public</code> folder from the repo zip, then redeploy.</p>
</body></html>`);
});

app.get("/health", (req, res) => res.json({ ok: true }));

// Generate PDF
// Frontend posts JSON fields. Optional file uploads can be added later.
app.post("/api/generate", upload.any(), async (req, res) => {
  try {
    const fields = req.body || {};
    const pdfBuffer = await generatePdf({ fields, files: req.files || [] });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="finance-memo.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({
      error: "PDF generation failed",
      details: err?.message || String(err),
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Finance Memo Generator v4 running on port ${PORT}`);
});

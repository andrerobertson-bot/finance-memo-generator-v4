
const express = require("express");
const { generatePdf } = require("./generate");
const app = express();
app.use(express.json());

app.post("/api/generate", async (req, res) => {
  try {
    const pdfBuffer = await generatePdf(req.body);
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("PDF generation error");
  }
});

app.listen(10000, () => console.log("Server running on 10000"));

const fs = require('fs');
const path = require('path');
const { generatePdf } = require('./server/generate');

(async () => {
  const buf = await generatePdf({
    companyName: 'Connect FG',
    projectName: 'Dubai Harbour Residences',
    loanAmount: '2,500,000',
    referenceNumber: 'PRP.17213',
    dateText: '15 January 2026',
    websiteLine: 'www.connectfa.com',
    footerLine1: 'Connect FG Commercial Pty Ltd',
    footerLine2: 'ABN 00 000 000 000'
  });

  const outPath = path.join(__dirname, 'out_try4.pdf');
  fs.writeFileSync(outPath, buf);
  console.log('wrote', outPath, buf.length);
})();

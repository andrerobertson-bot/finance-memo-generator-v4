/**
 * Fetch full, official font files used by the template engine.
 *
 * Why:
 * - Prevent missing glyphs ("□" boxes) caused by subset / incomplete font files.
 * - Keep deployments deterministic by embedding complete TTF programs.
 *
 * Runs automatically on `npm install` via `postinstall`.
 *
 * You can skip downloads by setting NO_FETCH_FONTS=1.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

if (process.env.NO_FETCH_FONTS === '1') {
  console.log('[fonts] NO_FETCH_FONTS=1 set — skipping font download.');
  process.exit(0);
}

const fontsDir = path.join(__dirname, '..', 'templates', 'fonts');

/**
 * Download a URL to a file.
 */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const tmp = dest + '.tmp';
    const file = fs.createWriteStream(tmp);

    https
      .get(url, (res) => {
        // Follow redirects (GitHub sometimes returns 302)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close(() => {
            fs.existsSync(tmp) && fs.unlinkSync(tmp);
            resolve(download(res.headers.location, dest));
          });
          return;
        }

        if (res.statusCode !== 200) {
          file.close(() => {
            fs.existsSync(tmp) && fs.unlinkSync(tmp);
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          });
          return;
        }

        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            fs.renameSync(tmp, dest);
            resolve();
          });
        });
      })
      .on('error', (err) => {
        file.close(() => {
          fs.existsSync(tmp) && fs.unlinkSync(tmp);
          reject(err);
        });
      });
  });
}

/**
 * Heuristic: subset/broken TTFs are often tiny. Full fonts are typically 50KB+.
 */
function looksTooSmall(filePath, minBytes = 50_000) {
  try {
    const stat = fs.statSync(filePath);
    return stat.size < minBytes;
  } catch {
    return true;
  }
}

const FONT_SOURCES = [
  // Raleway (static weights)
  {
    name: 'Raleway-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/raleway/static/Raleway-Regular.ttf',
  },
  {
    name: 'Raleway-Medium.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/raleway/static/Raleway-Medium.ttf',
  },
  {
    name: 'Raleway-SemiBold.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/raleway/static/Raleway-SemiBold.ttf',
  },
  {
    name: 'Raleway-Bold.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/raleway/static/Raleway-Bold.ttf',
  },

  // Merriweather
  {
    name: 'Merriweather-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather-Regular.ttf',
  },
  {
    name: 'Merriweather-Black.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather-Black.ttf',
  },
  {
    name: 'Merriweather-BlackItalic.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather-BlackItalic.ttf',
  },
];

(async () => {
  fs.mkdirSync(fontsDir, { recursive: true });

  const results = [];
  for (const f of FONT_SOURCES) {
    const dest = path.join(fontsDir, f.name);
    const needs = looksTooSmall(dest);
    if (!needs) {
      results.push({ file: f.name, status: 'ok (kept)' });
      continue;
    }

    try {
      console.log(`[fonts] Downloading ${f.name} ...`);
      await download(f.url, dest);
      results.push({ file: f.name, status: 'downloaded' });
    } catch (err) {
      results.push({ file: f.name, status: `FAILED: ${err.message}` });
    }
  }

  // Report
  const failed = results.filter((r) => r.status.startsWith('FAILED'));
  for (const r of results) {
    console.log(`[fonts] ${r.file}: ${r.status}`);
  }

  if (failed.length) {
    console.warn('[fonts] WARNING: Some fonts failed to download. The app may render fallback boxes (□).');
    console.warn('[fonts] If your deployment environment blocks outbound HTTPS, set NO_FETCH_FONTS=1 and commit the font files into templates/fonts/.');
  }
})();

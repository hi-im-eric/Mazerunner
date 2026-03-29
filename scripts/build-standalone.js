const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src', 'standalone');
const templatePath = path.join(srcDir, 'template.html');
const modulesDir = path.join(srcDir, 'modules');
const inlineAssetsDir = path.join(rootDir, 'build-assets', 'inline');
const mainOutputPath = path.join(rootDir, 'mazerunner.html');
const cacheDir = path.join(rootDir, '.cache');
const embeddedImageCachePath = path.join(cacheDir, 'standalone-embedded-image-cache.json');

const EMBEDDED_IMAGE_PATTERN = /data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+/g;
const EMBEDDED_IMAGE_CACHE_VERSION = 2;
const EMBEDDED_IMAGE_MIN_LENGTH = 48 * 1024;
const EMBEDDED_IMAGE_MAX_EDGE = 1800;
const EMBEDDED_IMAGE_QUALITY = 0.82;
const EMBEDDED_IMAGE_MIN_SAVINGS_RATIO = 0.95;

const INLINE_MODULES = [
  {
    placeholder: '/* __INLINE_MODULE:benchmark-scenarios__ */',
    path: path.join(modulesDir, 'benchmark-scenarios.js')
  },
  {
    placeholder: '/* __INLINE_MODULE:analytics-replay__ */',
    path: path.join(modulesDir, 'analytics-replay.js')
  },
  {
    placeholder: '/* __INLINE_MODULE:challenge-engine__ */',
    path: path.join(modulesDir, 'challenge-engine.js')
  }
];

const hcmAssetsDir = path.join(rootDir, 'HCM Visual Assets');
const finAssetsDir = path.join(rootDir, 'FIN Visual Assets');
const procAssetsDir = path.join(rootDir, 'PROC Visual Assets');
const itsmAssetsDir = path.join(rootDir, 'ITSM Visual Assets');
const crmAssetsDir = path.join(rootDir, 'CRM Visual Assets');
const hcAssetsDir = path.join(rootDir, 'HC VIsual Assets');
const legalAssetsDir = path.join(rootDir, 'Legal and Contracts Visual Assets');
const erpAssetsDir = path.join(rootDir, 'ERP Visual Assets');

const INLINE_ASSETS = [
  // Core fantasy standalone assets extracted from template.html to keep the source file lighter.
  { placeholder: '__INLINE_ASSET:FANTASY_SCENE_BANNER__', path: path.join(inlineAssetsDir, 'fantasy-scene-banner.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_SIDEBAR_TEXTURE__', path: path.join(inlineAssetsDir, 'fantasy-sidebar-texture.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_KPI_TEXTURE__', path: path.join(inlineAssetsDir, 'fantasy-kpi-texture.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_CONTENT_TEXTURE__', path: path.join(inlineAssetsDir, 'fantasy-content-texture.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_TORCH__', path: path.join(inlineAssetsDir, 'fantasy-torch.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_EYES__', path: path.join(inlineAssetsDir, 'fantasy-eyes.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_LIBRARY__', path: path.join(inlineAssetsDir, 'fantasy-library.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_COMPASS__', path: path.join(inlineAssetsDir, 'fantasy-compass.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_SCROLL__', path: path.join(inlineAssetsDir, 'fantasy-scroll.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_MARKETPLACE__', path: path.join(inlineAssetsDir, 'fantasy-marketplace.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_GOBLIN_SCRIBE__', path: path.join(inlineAssetsDir, 'fantasy-goblin-scribe.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_POTIONS__', path: path.join(inlineAssetsDir, 'fantasy-potions.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_GOBLIN_POPOUT__', path: path.join(inlineAssetsDir, 'fantasy-goblin-popout.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_SWORD__', path: path.join(inlineAssetsDir, 'fantasy-sword.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_LIVING_SCROLL__', path: path.join(inlineAssetsDir, 'fantasy-living-scroll.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_SUMMONING_CIRCLE__', path: path.join(inlineAssetsDir, 'fantasy-summoning-circle.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_INKPOT__', path: path.join(inlineAssetsDir, 'fantasy-inkpot.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_INK_SPLATTER__', path: path.join(inlineAssetsDir, 'fantasy-ink-splatter.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_GREMLIN__', path: path.join(inlineAssetsDir, 'fantasy-gremlin.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_WRAITH__', path: path.join(inlineAssetsDir, 'fantasy-wraith.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_WRAITH_FACE__', path: path.join(inlineAssetsDir, 'fantasy-wraith-face.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_GELATINOUS_CUBE__', path: path.join(inlineAssetsDir, 'fantasy-gelatinous-cube.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_SLIME_TRAIL__', path: path.join(inlineAssetsDir, 'fantasy-slime-trail.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_COSMIC_HORROR_CLOSED__', path: path.join(inlineAssetsDir, 'fantasy-cosmic-horror-closed.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_COSMIC_HORROR_OPEN__', path: path.join(inlineAssetsDir, 'fantasy-cosmic-horror-open.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_DRAGON_2__', path: path.join(inlineAssetsDir, 'fantasy-dragon-2.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_DRAGON_3__', path: path.join(inlineAssetsDir, 'fantasy-dragon-3.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_DRAGON_4__', path: path.join(inlineAssetsDir, 'fantasy-dragon-4.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_DRAGON_5__', path: path.join(inlineAssetsDir, 'fantasy-dragon-5.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_DRAGON_6__', path: path.join(inlineAssetsDir, 'fantasy-dragon-6.webp') },
  { placeholder: '__INLINE_ASSET:FANTASY_DRAGON_7__', path: path.join(inlineAssetsDir, 'fantasy-dragon-7.webp') },

  // HCM domain visual assets (WebP)
  { placeholder: '__INLINE_ASSET:HCM_SIDEBAR__', path: path.join(hcmAssetsDir, 'HCM-1. Sidebar Decoration — Org Chart Tree.webp') },
  { placeholder: '__INLINE_ASSET:HCM_CONTENT_BG__', path: path.join(hcmAssetsDir, 'HCM-2. Content Background — Modern Office.webp') },
  { placeholder: '__INLINE_ASSET:HCM_CARD_1__', path: path.join(hcmAssetsDir, 'HCM-3. Card Decoration — Employee Badge.webp') },
  { placeholder: '__INLINE_ASSET:HCM_CARD_2__', path: path.join(hcmAssetsDir, 'HCM-4. Card Decoration — Benefits Package.webp') },
  { placeholder: '__INLINE_ASSET:HCM_CARD_3__', path: path.join(hcmAssetsDir, 'HCM-5. Card Decoration — Performance Review Clipboard.webp') },

  // Financial domain visual assets (WebP)
  { placeholder: '__INLINE_ASSET:FIN_SIDEBAR__', path: path.join(finAssetsDir, 'FIN-1. Sidebar Decoration — Calculator & Ledger.webp') },
  { placeholder: '__INLINE_ASSET:FIN_CONTENT_BG__', path: path.join(finAssetsDir, 'FIN-2. Content Background — Financial Dashboard.webp') },
  { placeholder: '__INLINE_ASSET:FIN_CARD_1__', path: path.join(finAssetsDir, 'FIN-3. Card Decoration — Coins & Currency.webp') },
  { placeholder: '__INLINE_ASSET:FIN_CARD_2__', path: path.join(finAssetsDir, 'FIN-4. Card Decoration — Balance Sheet.webp') },
  { placeholder: '__INLINE_ASSET:FIN_CARD_3__', path: path.join(finAssetsDir, 'FIN-5. Card Decoration — Growth Chart.webp') },

  // Procurement domain visual assets (WebP)
  { placeholder: '__INLINE_ASSET:PROC_SIDEBAR__', path: path.join(procAssetsDir, 'PROC-1. Sidebar Decoration — Supply Chain.webp') },
  { placeholder: '__INLINE_ASSET:PROC_CONTENT_BG__', path: path.join(procAssetsDir, 'PROC-2. Content Background — Warehouse.webp') },
  { placeholder: '__INLINE_ASSET:PROC_CARD_1__', path: path.join(procAssetsDir, 'PROC-3. Card Decoration — Purchase Order.webp') },
  { placeholder: '__INLINE_ASSET:PROC_CARD_2__', path: path.join(procAssetsDir, 'PROC-4. Card Decoration — Shipping Box.webp') },
  { placeholder: '__INLINE_ASSET:PROC_CARD_3__', path: path.join(procAssetsDir, 'PROC-5. Card Decoration — Vendor Handshake.webp') },

  // ITSM domain visual assets (WebP)
  { placeholder: '__INLINE_ASSET:ITSM_SIDEBAR__', path: path.join(itsmAssetsDir, 'ITSM-1. Sidebar Decoration — Server Rack.webp') },
  { placeholder: '__INLINE_ASSET:ITSM_CONTENT_BG__', path: path.join(itsmAssetsDir, 'ITSM-2. Content Background — Network Operations Center.webp') },
  { placeholder: '__INLINE_ASSET:ITSM_CARD_1__', path: path.join(itsmAssetsDir, 'ITSM-3. Card Decoration — Support Ticket.webp') },
  { placeholder: '__INLINE_ASSET:ITSM_CARD_2__', path: path.join(itsmAssetsDir, 'ITSM-4. Card Decoration — Network Diagram.webp') },
  { placeholder: '__INLINE_ASSET:ITSM_CARD_3__', path: path.join(itsmAssetsDir, 'TSM-5. Card Decoration — Gear & Wrench.webp') },

  // CRM domain visual assets (WebP)
  { placeholder: '__INLINE_ASSET:CRM_SIDEBAR__', path: path.join(crmAssetsDir, 'CRM-1. Sidebar Decoration — Sales Funnel.webp') },
  { placeholder: '__INLINE_ASSET:CRM_CONTENT_BG__', path: path.join(crmAssetsDir, 'CRM-2. Content Background — Sales Floor.webp') },
  { placeholder: '__INLINE_ASSET:CRM_CARD_1__', path: path.join(crmAssetsDir, 'CRM-3. Card Decoration — Contact Card.webp') },
  { placeholder: '__INLINE_ASSET:CRM_CARD_2__', path: path.join(crmAssetsDir, 'CRM-4. Card Decoration — Deal Pipeline.webp') },
  { placeholder: '__INLINE_ASSET:CRM_CARD_3__', path: path.join(crmAssetsDir, 'CRM-5. Card Decoration — Handshake & Contract.webp') },

  // Healthcare domain visual assets (WebP)
  { placeholder: '__INLINE_ASSET:HC_SIDEBAR__', path: path.join(hcAssetsDir, 'HC-1. Sidebar Decoration — Caduceus.webp') },
  { placeholder: '__INLINE_ASSET:HC_CONTENT_BG__', path: path.join(hcAssetsDir, 'HC-2. Content Background — Hospital Corridor.webp') },
  { placeholder: '__INLINE_ASSET:HC_CARD_1__', path: path.join(hcAssetsDir, 'HC-3. Card Decoration — Patient Chart.webp') },
  { placeholder: '__INLINE_ASSET:HC_CARD_2__', path: path.join(hcAssetsDir, 'HC-4. Card Decoration — Stethoscope.webp') },
  { placeholder: '__INLINE_ASSET:HC_CARD_3__', path: path.join(hcAssetsDir, 'HC-5. Card Decoration — Medicine & Clipboard.webp') },

  // Legal & Contracts domain visual assets (WebP)
  { placeholder: '__INLINE_ASSET:LEGAL_SIDEBAR__', path: path.join(legalAssetsDir, 'LEGAL-1. Sidebar Decoration — Scales of Justice.webp') },
  { placeholder: '__INLINE_ASSET:LEGAL_CONTENT_BG__', path: path.join(legalAssetsDir, 'LEGAL-2. Content Background — Law Library.webp') },
  { placeholder: '__INLINE_ASSET:LEGAL_CARD_1__', path: path.join(legalAssetsDir, 'LEGAL-3. Card Decoration — Contract Document.webp') },
  { placeholder: '__INLINE_ASSET:LEGAL_CARD_2__', path: path.join(legalAssetsDir, 'LEGAL-4. Card Decoration — Gavel & Block.webp') },
  { placeholder: '__INLINE_ASSET:LEGAL_CARD_3__', path: path.join(legalAssetsDir, 'LEGAL-5. Card Decoration — Legal File Folders.webp') },

  // ERP domain visual assets (WebP)
  { placeholder: '__INLINE_ASSET:ERP_SIDEBAR__', path: path.join(erpAssetsDir, 'ERP-1. Sidebar Decoration — Interconnected Modules.webp') },
  { placeholder: '__INLINE_ASSET:ERP_CONTENT_BG__', path: path.join(erpAssetsDir, 'ERP-2. Content Background — Corporate Command Center.webp') },
  { placeholder: '__INLINE_ASSET:ERP_CARD_1__', path: path.join(erpAssetsDir, 'ERP-3. Card Decoration — Workflow Diagram.webp') },
  { placeholder: '__INLINE_ASSET:ERP_CARD_2__', path: path.join(erpAssetsDir, 'ERP-4. Card Decoration — Inventory Barcode.webp') },
  { placeholder: '__INLINE_ASSET:ERP_CARD_3__', path: path.join(erpAssetsDir, 'ERP-5. Card Decoration — Dashboard Gauge.webp') },
];

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required build input is missing: ${path.relative(rootDir, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function inlineAsset(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required build asset is missing: ${path.relative(rootDir, filePath)}`);
  }
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = extension === '.png'
    ? 'image/png'
    : extension === '.jpg' || extension === '.jpeg'
      ? 'image/jpeg'
      : extension === '.webp'
        ? 'image/webp'
        : null;

  if (!mimeType) {
    throw new Error(`Unsupported build asset type: ${path.relative(rootDir, filePath)}`);
  }

  return `data:${mimeType};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function loadEmbeddedImageCache() {
  if (!fs.existsSync(embeddedImageCachePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(embeddedImageCachePath, 'utf8'));
  } catch (error) {
    console.warn(`Ignoring unreadable embedded image cache: ${path.relative(rootDir, embeddedImageCachePath)}`);
    return {};
  }
}

function saveEmbeddedImageCache(cache) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(embeddedImageCachePath, JSON.stringify(cache, null, 2));
}

async function createEmbeddedImageOptimizer() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (error) {
    console.warn('Playwright is not available; embedded image optimization is disabled for this build.');
    return null;
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    console.warn(`Unable to launch Chromium for embedded image optimization: ${error.message}`);
    return null;
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  return {
    async optimize(dataUri) {
      return page.evaluate(async ({ dataUri, maxEdge, quality }) => {
        const image = new Image();
        image.src = dataUri;
        await image.decode();

        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { alpha: true });
        context.drawImage(image, 0, 0, width, height);
        const optimizedDataUri = canvas.toDataURL('image/webp', quality);

        return {
          originalWidth: image.width,
          originalHeight: image.height,
          width,
          height,
          optimizedDataUri
        };
      }, {
        dataUri,
        maxEdge: EMBEDDED_IMAGE_MAX_EDGE,
        quality: EMBEDDED_IMAGE_QUALITY
      });
    },
    async close() {
      await page.close();
      await browser.close();
    }
  };
}

async function optimizeEmbeddedImages(html) {
  if (process.env.MAZERUNNER_SKIP_IMAGE_OPTIMIZATION === '1') {
    return {
      html,
      stats: {
        optimizedImages: 0,
        totalImages: 0,
        bytesSaved: 0,
        usedCache: 0
      }
    };
  }

  const matches = html.match(EMBEDDED_IMAGE_PATTERN) || [];
  const uniqueDataUris = [...new Set(matches)];
  const dataUrisToProcess = uniqueDataUris.filter(dataUri => dataUri.length >= EMBEDDED_IMAGE_MIN_LENGTH);

  if (dataUrisToProcess.length === 0) {
    return {
      html,
      stats: {
        optimizedImages: 0,
        totalImages: uniqueDataUris.length,
        bytesSaved: 0,
        usedCache: 0
      }
    };
  }

  const cache = loadEmbeddedImageCache();
  const replacements = new Map();
  const stats = {
    optimizedImages: 0,
    totalImages: uniqueDataUris.length,
    bytesSaved: 0,
    usedCache: 0
  };
  let optimizer = null;
  let optimizerUnavailable = false;
  let cacheChanged = false;

  try {
    for (const dataUri of dataUrisToProcess) {
      const sourceHash = sha1(dataUri);
      const cachedEntry = cache[sourceHash];
      if (cachedEntry && cachedEntry.version === EMBEDDED_IMAGE_CACHE_VERSION) {
        replacements.set(dataUri, cachedEntry.outputDataUri);
        stats.bytesSaved += Math.max(0, dataUri.length - cachedEntry.outputDataUri.length);
        if (cachedEntry.outputDataUri !== dataUri) {
          stats.optimizedImages += 1;
        }
        stats.usedCache += 1;
        continue;
      }

      if (!optimizer && !optimizerUnavailable) {
        optimizer = await createEmbeddedImageOptimizer();
        optimizerUnavailable = !optimizer;
      }

      let outputDataUri = dataUri;
      if (!optimizer) {
        replacements.set(dataUri, outputDataUri);
        continue;
      }

      const optimizedResult = await optimizer.optimize(dataUri);
      if (optimizedResult.optimizedDataUri.length <= dataUri.length * EMBEDDED_IMAGE_MIN_SAVINGS_RATIO) {
        outputDataUri = optimizedResult.optimizedDataUri;
        stats.optimizedImages += 1;
        stats.bytesSaved += dataUri.length - optimizedResult.optimizedDataUri.length;
      }

      replacements.set(dataUri, outputDataUri);
      cache[sourceHash] = {
        version: EMBEDDED_IMAGE_CACHE_VERSION,
        outputDataUri
      };
      cacheChanged = true;
    }
  } finally {
    if (optimizer) {
      await optimizer.close();
    }
  }

  if (cacheChanged) {
    saveEmbeddedImageCache(cache);
  }

  replacements.forEach((replacement, original) => {
    if (replacement !== original) {
      html = html.replaceAll(original, replacement);
    }
  });

  return { html, stats };
}

async function renderStandaloneHtml() {
  let html = readRequiredFile(templatePath);

  INLINE_MODULES.forEach(moduleSpec => {
    const moduleSource = readRequiredFile(moduleSpec.path).trim();
    if (!html.includes(moduleSpec.placeholder)) {
      throw new Error(`Template placeholder not found: ${moduleSpec.placeholder}`);
    }
    html = html.replace(moduleSpec.placeholder, moduleSource);
  });

  INLINE_ASSETS.forEach(assetSpec => {
    if (!html.includes(assetSpec.placeholder)) {
      throw new Error(`Template placeholder not found: ${assetSpec.placeholder}`);
    }
    html = html.replaceAll(assetSpec.placeholder, inlineAsset(assetSpec.path));
  });

  const optimizedResult = await optimizeEmbeddedImages(html);
  return {
    html: `${optimizedResult.html.trimEnd()}\n`,
    stats: optimizedResult.stats
  };
}

async function buildStandalone() {
  const result = await renderStandaloneHtml();
  fs.writeFileSync(mainOutputPath, result.html);
  return {
    mainOutputPath,
    stats: result.stats
  };
}

if (require.main === module) {
  buildStandalone()
    .then(result => {
      const savedKilobytes = (result.stats.bytesSaved / 1024).toFixed(1);
      console.log(
        `Built ${path.relative(rootDir, result.mainOutputPath)} ` +
        `(${result.stats.optimizedImages}/${result.stats.totalImages} embedded images optimized, ` +
        `${savedKilobytes} KB saved, ${result.stats.usedCache} cache hits)`
      );
    })
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  buildStandalone,
  renderStandaloneHtml
};

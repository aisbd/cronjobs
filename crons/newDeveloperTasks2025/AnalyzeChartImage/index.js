const { OpenAI } = require("openai");
const axios = require("axios");
const fs = require("fs");
const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '/.env') });


const util = require('util');
const db = require('../../../db');
const query = util.promisify(db.query).bind(db);

// Fixed output folders (do not parse from args)
const OUTPUT_DIR = path.join(__dirname, 'tempImages');
const RESPONSE_DIR = path.join(__dirname, 'tempResponse');
const sharp = require('sharp');
const VISION_TARGET_WIDTH = 2048;
const VISION_TARGET_HEIGHT = 4096;
username=process.env.username
password=process.env.pass

async function getInstrumentsForAnalysis(limit = 10) {
  const sql = `
    SELECT code, name
    FROM instruments
    WHERE code IS NOT NULL and sector_id is not null
      AND (analysis_updated_at IS NULL OR analysis_updated_at < updated_at) and updated_at > DATE_SUB(NOW(), INTERVAL 4 DAY)
    ORDER BY value desc
    LIMIT ?
  `;
  return query(sql, [limit]);
}

// Use minimist for robust argument parsing since it's in package.json
const minimist = require('minimist');
const parsedArgs = minimist(process.argv.slice(2), {
  string: ['code', 'name', 'c', 'n', 'limit', 'batch', 'context-rows', 'contextRows', 'news'],
  boolean: ['verbose', 'dry-run', 'dryRun', 'dry', 'help', 'h'],
  alias: {
    c: 'code',
    n: 'name',
    h: 'help',
    v: 'verbose',
    l: 'limit',
    b: 'batch'
  }
});

// Handle help
if (parsedArgs.help) {
  console.log('\nUsage: node index.js [options]\n');
  console.log('Options:');
  console.log('  -c, --code <SYMBOL>    Symbol code, e.g. DSEX');
  console.log('  -n, --name <NAME>      Full name, e.g. "Dhaka Stock Exchange Index"');
  console.log('  -l, --limit <N>        Batch limit (default: 500)');
  console.log('  -b, --batch <N>        Parallel batch size (default: 10)');
  console.log('  --delay <N>            Chart delay seconds (default: 2)');
  console.log('  --context-rows <N|all> OHLCV rows in prompt context (default: all)');
  console.log('  --news "<TEXT>"        Supporting news/context text');
  console.log('  -v, --verbose          Verbose logging');
  console.log('  --dry-run              Print built URL and prompt then exit');
  process.exit(0);
}

if (parsedArgs.verbose) console.log('Parsed Arguments:', parsedArgs);

const apiKey = process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY;
// Allow running in --dry-run mode without an API key configured
if (!apiKey && !(parsedArgs['dry-run'] || parsedArgs.dryRun || parsedArgs.dry)) {
	console.error("OPENAI_API_KEY or CHATGPT_API_KEY is not set.");
	process.exit(1);
}

let client;
if (apiKey) client = new OpenAI({ apiKey });

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeAnalysisScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeDecimal(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(value, maxLength = 255) {
  if (value === undefined || value === null) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeTimestamp(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n)) return null;
  return n < 1e12 ? n * 1000 : n;
}

function normalizeHistoryPayload(payload) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const data = root.data && typeof root.data === 'object' ? root.data : root;

  let rows = [];
  // Format supported: [open[], high[], low[], close[], volume[], time[]]
  if (Array.isArray(data) && data.length >= 6 && data.slice(0, 6).every(Array.isArray)) {
    const opens = data[0];
    const highs = data[1];
    const lows = data[2];
    const closes = data[3];
    const volumes = data[4];
    const times = data[5];
    const len = Math.min(opens.length, highs.length, lows.length, closes.length, times.length);
    rows = Array.from({ length: len }, (_, i) => ({
      t: normalizeTimestamp(times[i]),
      o: toNum(opens[i]),
      h: toNum(highs[i]),
      l: toNum(lows[i]),
      c: toNum(closes[i]),
      v: toNum(volumes?.[i] ?? 0)
    }));
  } else 
  if (Array.isArray(data)) {
    rows = data.map((r) => ({
      t: normalizeTimestamp(r.t || r.time || r.timestamp || r.date),
      o: toNum(r.o || r.open),
      h: toNum(r.h || r.high),
      l: toNum(r.l || r.low),
      c: toNum(r.c || r.close),
      v: toNum(r.v || r.volume || 0)
    }));
  } else if (Array.isArray(data.t) && Array.isArray(data.o) && Array.isArray(data.h) && Array.isArray(data.l) && Array.isArray(data.c)) {
    rows = data.t.map((t, i) => ({
      t: normalizeTimestamp(t),
      o: toNum(data.o[i]),
      h: toNum(data.h[i]),
      l: toNum(data.l[i]),
      c: toNum(data.c[i]),
      v: toNum(data.v?.[i] ?? 0)
    }));
  } else if (Array.isArray(root.t) && Array.isArray(root.o) && Array.isArray(root.h) && Array.isArray(root.l) && Array.isArray(root.c)) {
    rows = root.t.map((t, i) => ({
      t: normalizeTimestamp(t),
      o: toNum(root.o[i]),
      h: toNum(root.h[i]),
      l: toNum(root.l[i]),
      c: toNum(root.c[i]),
      v: toNum(root.v?.[i] ?? 0)
    }));
  }

  return rows
    .filter((r) => r.t && r.o !== null && r.h !== null && r.l !== null && r.c !== null)
    .sort((a, b) => a.t - b.t);
}

function calcSMA(values, period) {
  const out = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function calcEMA(values, period) {
  const out = Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let ema = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (ema === null) ema = v;
    else ema = (v - ema) * k + ema;
    out[i] = ema;
  }
  return out;
}

function calcRSI(closes, period = 14) {
  const out = Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses += -change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd = closes.map((_, i) => (ema12[i] !== null && ema26[i] !== null ? ema12[i] - ema26[i] : null));
  const signal = calcEMA(macd.map((v) => v ?? 0), 9);
  const hist = macd.map((v, i) => (v !== null && signal[i] !== null ? v - signal[i] : null));
  return { macd, signal, hist };
}

function xmlEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeAsciiLabel(input, fallback = 'N/A') {
  const cleaned = String(input ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

let cachedEmbeddedFontCss = null;

function getEmbeddedFontCss() {
  if (cachedEmbeddedFontCss !== null) return cachedEmbeddedFontCss;
  const candidates = [
    path.join(__dirname, 'fonts', 'DejaVuSans.ttf'),
    '/src/crons/newDeveloperTasks2025/AnalyzeChartImage/fonts/DejaVuSans.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    path.join(__dirname, 'fonts', 'NotoSans-Regular.ttf'),
    '/src/crons/newDeveloperTasks2025/AnalyzeChartImage/fonts/NotoSans-Regular.ttf',
    '/src/crons/newDeveloperTasks2025/fonts/NotoSans-Regular.ttf',
    path.join(__dirname, 'fonts', 'NotoSansBengali-Regular.ttf'),
    '/src/crons/newDeveloperTasks2025/AnalyzeChartImage/fonts/NotoSansBengali-Regular.ttf',
    '/src/crons/newDeveloperTasks2025/fonts/NotoSansBengali-Regular.ttf'
  ];
  const fontPath = candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch (_) {
      return false;
    }
  });

  try {
    if (!fontPath) {
      cachedEmbeddedFontCss = '';
      return cachedEmbeddedFontCss;
    }
    const ttfBase64 = fs.readFileSync(fontPath).toString('base64');
    cachedEmbeddedFontCss = `
    @font-face {
      font-family: 'chart_text';
      src: url('data:font/ttf;base64,${ttfBase64}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }`;
    if (parsedArgs.verbose) console.log('🎨 Embedded chart font:', fontPath);
  } catch (err) {
    if (parsedArgs.verbose) console.error('❌ Failed to read or encode font:', err.message);
    cachedEmbeddedFontCss = '';
  }
  return cachedEmbeddedFontCss;
}

function polylineFromValues(values, color, strokeWidth, xFor, yFor) {
  const points = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || !Number.isFinite(v)) continue;
    points.push(`${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`);
  }
  if (points.length < 2) return '';
  return `<polyline fill="none" stroke="${color}" stroke-width="${strokeWidth}" points="${points.join(' ')}" />`;
}

function formatDateUTC(ts) {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function compactText(v, maxLen = 80) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1))}…`;
}

function buildChartContext(candles, symbol, name) {
  const closes = candles.map((c) => c.c);
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const volumes = candles.map((c) => c.v || 0);
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const rsi14 = calcRSI(closes, 14);
  const { macd, signal, hist } = calcMACD(closes);

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] || last;
  const lastClose = last.c;
  const prevClose = prev.c;
  const change = prevClose ? ((lastClose - prevClose) / prevClose) * 100 : 0;
  const rangeN = 20;
  const recent = candles.slice(-rangeN);
  const rangeHigh = Math.max(...recent.map((c) => c.h));
  const rangeLow = Math.min(...recent.map((c) => c.l));
  const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(20, volumes.length));
  const lastVol = volumes[volumes.length - 1] || 0;
  const volRatio = avgVol20 ? lastVol / avgVol20 : 0;

  return {
    symbol: safeAsciiLabel(symbol, 'SYMBOL'),
    name: String(name || symbol || 'N/A').trim(),
    lastClose: lastClose.toFixed(2),
    dayChangePct: change.toFixed(2),
    sma20: sma20[sma20.length - 1] !== null ? sma20[sma20.length - 1].toFixed(2) : 'N/A',
    sma50: sma50[sma50.length - 1] !== null ? sma50[sma50.length - 1].toFixed(2) : 'N/A',
    rsi14: rsi14[rsi14.length - 1] !== null ? rsi14[rsi14.length - 1].toFixed(2) : 'N/A',
    macd: macd[macd.length - 1] !== null ? macd[macd.length - 1].toFixed(4) : 'N/A',
    macdSignal: signal[signal.length - 1] !== null ? signal[signal.length - 1].toFixed(4) : 'N/A',
    macdHist: hist[hist.length - 1] !== null ? hist[hist.length - 1].toFixed(4) : 'N/A',
    range20High: rangeHigh.toFixed(2),
    range20Low: rangeLow.toFixed(2),
    volumeVs20Avg: `${volRatio.toFixed(2)}x`,
    dateFrom: formatDateUTC(candles[0].t),
    dateTo: formatDateUTC(candles[candles.length - 1].t)
  };
}

function buildChartSvg(candles, symbol, name) {
  const width = 1400;
  const height = 1040;
  const left = 88;
  const right = 72;
  const top = 84;
  const gap = 20;
  const priceH = 460;
  const volumeH = 120;
  const rsiH = 130;
  const macdH = 130;

  const priceTop = top;
  const priceBottom = priceTop + priceH;
  const volumeTop = priceBottom + gap;
  const volumeBottom = volumeTop + volumeH;
  const rsiTop = volumeBottom + gap;
  const rsiBottom = rsiTop + rsiH;
  const macdTop = rsiBottom + gap;
  const macdBottom = macdTop + macdH;

  const plotW = width - left - right;
  const closes = candles.map((c) => c.c);
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const volumes = candles.map((c) => c.v || 0);

  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const rsi14 = calcRSI(closes, 14);
  const { macd, signal, hist } = calcMACD(closes);

  const minPrice = Math.min(...lows);
  const maxPrice = Math.max(...highs);
  const pricePad = Math.max((maxPrice - minPrice) * 0.06, maxPrice * 0.01, 1);
  const yPriceMin = minPrice - pricePad;
  const yPriceMax = maxPrice + pricePad;

  const maxVol = Math.max(...volumes, 1);
  const xStep = plotW / Math.max(1, candles.length);
  const candleW = Math.max(2, Math.min(10, xStep * 0.72));

  const xFor = (i) => left + i * xStep + xStep / 2;
  const yPrice = (v) => priceBottom - ((v - yPriceMin) / (yPriceMax - yPriceMin || 1)) * priceH;
  const yVol = (v) => volumeBottom - (v / maxVol) * volumeH;
  const yRsi = (v) => rsiBottom - (v / 100) * rsiH;

  const macdVals = hist.filter((v) => v !== null).concat(macd.filter((v) => v !== null)).concat(signal.filter((v) => v !== null));
  const minMacd = macdVals.length ? Math.min(...macdVals) : -1;
  const maxMacd = macdVals.length ? Math.max(...macdVals) : 1;
  const macdPad = Math.max((maxMacd - minMacd) * 0.18, 0.2);
  const yMacdMin = minMacd - macdPad;
  const yMacdMax = maxMacd + macdPad;
  const yMacd = (v) => macdBottom - ((v - yMacdMin) / (yMacdMax - yMacdMin || 1)) * macdH;
  const yMacdZero = yMacd(0);
  const context = buildChartContext(candles, symbol, name);
  const newsText = compactText(parsedArgs.news || 'None', 58);
  const headerName = compactText(context.name, 48);

  let svg = '';
  const embeddedFontCss = getEmbeddedFontCss();
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  svg += `<style>
    ${embeddedFontCss}
    body {
      font-kerning: normal;
      text-rendering: geometricPrecision;
    }
    text {
      font-family: "chart_text", "DejaVu Sans", "Noto Sans", "Arial", sans-serif;
      font-weight: normal;
      font-kerning: normal;
      text-rendering: geometricPrecision;
    }
  </style>`;
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#0b1220"/>`;
  svg += `<rect x="${left}" y="18" width="${plotW}" height="56" fill="#13203a" rx="8"/>`;
  svg += `<text x="${left + 12}" y="40" fill="#d7e6ff" font-size="17" font-weight="700">${xmlEscape(context.symbol)} - ${xmlEscape(headerName)}</text>`;
  svg += `<text x="${left + plotW - 12}" y="40" fill="#a7bddf" font-size="12" text-anchor="end">News: ${xmlEscape(newsText)}</text>`;
  svg += `<text x="${left + 12}" y="60" fill="#a7bddf" font-size="12">Range: ${context.dateFrom} to ${context.dateTo} | Last: ${context.lastClose} | Chg: ${context.dayChangePct}% | S20: ${context.sma20} | S50: ${context.sma50} | RSI14: ${context.rsi14}</text>`;

  const panelFill = '#0f1a2d';
  const grid = '#2a3a57';
  svg += `<rect x="${left}" y="${priceTop}" width="${plotW}" height="${priceH}" fill="${panelFill}" rx="8"/>`;
  svg += `<rect x="${left}" y="${volumeTop}" width="${plotW}" height="${volumeH}" fill="${panelFill}" rx="8"/>`;
  svg += `<rect x="${left}" y="${rsiTop}" width="${plotW}" height="${rsiH}" fill="${panelFill}" rx="8"/>`;
  svg += `<rect x="${left}" y="${macdTop}" width="${plotW}" height="${macdH}" fill="${panelFill}" rx="8"/>`;

  for (let i = 0; i <= 14; i++) {
    const y = priceTop + (priceH * i) / 14;
    const label = (yPriceMax - ((y - priceTop) / priceH) * (yPriceMax - yPriceMin)).toFixed(2);
    svg += `<line x1="${left}" y1="${y}" x2="${left + plotW}" y2="${y}" stroke="${grid}" stroke-width="1"/>`;
    svg += `<text x="${left - 10}" y="${y + 4}" fill="#8ea5c8" font-size="12" text-anchor="end">${label}</text>`;
  }

  const minLabelGapPx = 58;
  const xTickEvery = Math.max(1, Math.ceil(minLabelGapPx / Math.max(1, xStep)));
  for (let i = 0; i < candles.length; i += xTickEvery) {
    const x = xFor(i);
    const d = new Date(candles[i].t);
    const lbl = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
    svg += `<line x1="${x}" y1="${priceTop}" x2="${x}" y2="${macdBottom}" stroke="${grid}" stroke-width="1" stroke-dasharray="2 4"/>`;
    svg += `<text x="${x}" y="${macdBottom + 18}" fill="#8ea5c8" font-size="11" text-anchor="middle">${lbl}</text>`;
  }

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const x = xFor(i);
    const openY = yPrice(c.o);
    const closeY = yPrice(c.c);
    const highY = yPrice(c.h);
    const lowY = yPrice(c.l);
    const bullish = c.c >= c.o;
    const color = bullish ? '#2ecc71' : '#ef5350';
    const bodyY = Math.min(openY, closeY);
    const bodyH = Math.max(Math.abs(closeY - openY), 1.2);

    svg += `<line x1="${x.toFixed(1)}" y1="${highY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${lowY.toFixed(1)}" stroke="${color}" stroke-width="1.2"/>`;
    svg += `<rect x="${(x - candleW / 2).toFixed(1)}" y="${bodyY.toFixed(1)}" width="${candleW.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="${color}" opacity="0.95"/>`;

    const volY = yVol(c.v || 0);
    svg += `<rect x="${(x - candleW / 2).toFixed(1)}" y="${volY.toFixed(1)}" width="${candleW.toFixed(1)}" height="${(volumeBottom - volY).toFixed(1)}" fill="${color}" opacity="0.7"/>`;
  }

  svg += polylineFromValues(sma20, '#ffb74d', 1.5, xFor, yPrice);
  svg += polylineFromValues(sma50, '#4fc3f7', 1.5, xFor, yPrice);
  svg += polylineFromValues(rsi14, '#f48fb1', 1.4, xFor, yRsi);
  svg += polylineFromValues(macd, '#ffd54f', 1.5, xFor, yMacd);
  svg += polylineFromValues(signal, '#64b5f6', 1.3, xFor, yMacd);

  svg += `<line x1="${left}" y1="${yRsi(70).toFixed(1)}" x2="${left + plotW}" y2="${yRsi(70).toFixed(1)}" stroke="#d66f6f" stroke-width="1" stroke-dasharray="4 3"/>`;
  svg += `<line x1="${left}" y1="${yRsi(30).toFixed(1)}" x2="${left + plotW}" y2="${yRsi(30).toFixed(1)}" stroke="#6cbf7a" stroke-width="1" stroke-dasharray="4 3"/>`;
  svg += `<line x1="${left}" y1="${yMacdZero.toFixed(1)}" x2="${left + plotW}" y2="${yMacdZero.toFixed(1)}" stroke="${grid}" stroke-width="1"/>`;
  svg += `<text x="${left + 8}" y="${priceTop + 16}" fill="#9fb6d9" font-size="12">Price + SMA20/50</text>`;
  svg += `<text x="${left + 8}" y="${volumeTop + 16}" fill="#9fb6d9" font-size="12">Volume</text>`;
  svg += `<text x="${left + 8}" y="${rsiTop + 16}" fill="#9fb6d9" font-size="12">RSI14</text>`;
  svg += `<text x="${left + 8}" y="${macdTop + 16}" fill="#9fb6d9" font-size="12">MACD (12,26,9)</text>`;

  for (let i = 0; i < hist.length; i++) {
    const v = hist[i];
    if (v === null) continue;
    const x = xFor(i);
    const y = yMacd(v);
    const yTop = Math.min(y, yMacdZero);
    const h = Math.max(Math.abs(y - yMacdZero), 1);
    const color = v >= 0 ? '#3ddc84' : '#ff6b6b';
    svg += `<rect x="${(x - candleW / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${candleW.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.7"/>`;
  }

  svg += `</svg>`;
  return svg;
}

async function fetchHistoryCandles(symbol, limit = 420) {
  const url = `https://vip.stocknow.com.bd/v1/instruments/${encodeURIComponent(symbol)}/history`;
  const response = await axios.get(url, {
    params: {
      data2: true,
      resolution: '1D',
      skip: 0
    },
    timeout: 20000
  });
  const candles = normalizeHistoryPayload(response.data);

  if (!candles.length) {
    throw new Error(`No OHLC candles received for ${symbol}`);
  }
  return candles.slice(-limit);
}

async function buildAndCompressChartImage(symbol, name) {
  const candles = await fetchHistoryCandles(symbol);
  const svg = buildChartSvg(candles, symbol, name);
  const context = buildChartContext(candles, symbol, name);
  const inputBuffer = Buffer.from(svg, 'utf8');
  const compressedBuffer = await sharp(inputBuffer)
    .resize(VISION_TARGET_WIDTH, VISION_TARGET_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 60,
      chromaSubsampling: '4:2:0',
      mozjpeg: true,
      progressive: true
    })
    .toBuffer();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const safeSymbol = symbol.replace(/[^a-z0-9_-]/gi, '').toUpperCase() || 'SYMBOL';
  const filename = `${safeSymbol}_${Date.now()}.jpg`;
  const savePath = path.join(OUTPUT_DIR, filename);

  try {
    fs.writeFileSync(savePath, compressedBuffer);
    if (parsedArgs.verbose) console.log('Saved generated chart image to:', savePath);
  } catch (err) {
    console.error('Failed to write generated chart image file:', err);
  }

  return {
    base64: compressedBuffer.toString("base64"),
    context,
    candles
  };
}


async function createWordPressPost(title, content) {
	const endpoint = `https://blog.stocknow.com.bd/wp-json/wp/v2/posts`;

	// Post Data Object
	// See reference link for all available fields (categories, tags, featured_media, etc.)
	const postData = {
		title,
		content,
		status: 'publish', // Options: 'publish', 'draft', 'pending', 'private', 'future'
		// categories: [1, 5], // Optional: Array of Category IDs
		// tags: [10, 12],     // Optional: Array of Tag IDs
		// author: 1,          // Optional: Author ID (defaults to authenticated user)
		// date: '2023-12-25T10:00:00', // Optional: Set specific date
	};

	try {
		// Axios automatically handles Basic Auth encoding and JSON headers
		const response = await axios.post(endpoint, postData, {
			auth: {
				username: username,
				password: password
			}
		});
		const data = response.data;
		// Success
		console.log('✅ Post created successfully!');
		console.log('-----------------------------------');
		console.log(`ID:     ${data.id}`);
		console.log(`Title:  ${data.title.raw}`);
		console.log(`Status: ${data.status}`);
		console.log(`Link:   ${data.link}`);
		console.log('-----------------------------------');
		return data;
	} catch (error) {
		// Axios encapsulates the response error in error.response
		if (error.response) {
			console.error(`❌ WordPress API Error (${error.response.status}):`, error.response.data);
		} else if (error.request) {
			console.error('❌ No response received:', error.request);
		} else {
			console.error('❌ Error setting up request:', error.message);
		}
	}
}


// Update instrument analysis in the database
async function updateInstrumentAnalysis(code, title, description, analysis = {}) {
  if (!code || !title || !description) {
    console.error('❌ Skipping instrument update: missing code/title/description');
    return;
  }

  const analysisScore = normalizeAnalysisScore(analysis.analysisScore);
  const analysisSignal = normalizeText(analysis.signal ?? analysis.analysisSignal, 20);
  const analysisConfidence = normalizeAnalysisScore(analysis.confidence ?? analysis.analysisConfidence);
  const expectedReturnPercent = normalizeDecimal(analysis.expectedReturnPercent);
  const maxUpsidePercent = normalizeDecimal(analysis.maxUpsidePercent);
  const downsideRiskPercent = normalizeDecimal(analysis.downsideRiskPercent);
  const entryZone = normalizeText(analysis.entryZone, 100);
  const targetPrice = normalizeDecimal(analysis.targetPrice);
  const stopLoss = normalizeDecimal(analysis.stopLoss);
  const supportLevel = normalizeDecimal(analysis.supportLevel);
  const resistanceLevel = normalizeDecimal(analysis.resistanceLevel);
  const riskRewardRatio = normalizeDecimal(analysis.riskRewardRatio);
  const breakoutProbability = normalizeAnalysisScore(analysis.breakoutProbability);
  const profitProbability = normalizeAnalysisScore(analysis.profitProbability);
  const riskLevel = normalizeText(analysis.riskLevel, 20);
  const sql = `
    UPDATE instruments
    SET
      analysisTitle = ?,
      analysisDescription = ?,
      analysisScore = ?,
      analysisSignal = ?,
      analysisConfidence = ?,
      expectedReturnPercent = ?,
      maxUpsidePercent = ?,
      downsideRiskPercent = ?,
      entryZone = ?,
      targetPrice = ?,
      stopLoss = ?,
      supportLevel = ?,
      resistanceLevel = ?,
      riskRewardRatio = ?,
      breakoutProbability = ?,
      profitProbability = ?,
      riskLevel = ?,
      analysis_updated_at = NOW()
    WHERE code = ?
    LIMIT 1
  `;

  try {
    const result = await query(sql, [
      title,
      description,
      analysisScore,
      analysisSignal,
      analysisConfidence,
      expectedReturnPercent,
      maxUpsidePercent,
      downsideRiskPercent,
      entryZone,
      targetPrice,
      stopLoss,
      supportLevel,
      resistanceLevel,
      riskRewardRatio,
      breakoutProbability,
      profitProbability,
      riskLevel,
      code
    ]);

    if (parsedArgs.verbose) {
      console.log('🗄️ Instrument analysis updated:', {
        code,
        analysisScore,
        analysisSignal,
        profitProbability,
        riskRewardRatio,
        affectedRows: result.affectedRows
      });
    }
  } catch (err) {
    console.error('❌ Failed to update instrument analysis:', err.message);
  }
}

function clearDirectoryContents(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (err) {
    console.error(`⚠️ Failed to clear directory ${dirPath}:`, err.message);
  }
}

function clearTempFilesOnStartup() {
  clearDirectoryContents(OUTPUT_DIR);
  clearDirectoryContents(RESPONSE_DIR);
  if (parsedArgs.verbose) {
    console.log('🧹 Cleared previous temp files from tempImages and tempResponse');
  }
}




async function runSingleAnalysis(input = {}) {
  try {
		// Map parsed args into variables with sensible defaults
		const symbol = (input.code || parsedArgs.code || parsedArgs.code?.toString() || 'DSEX').toString();
		const name = input.name || parsedArgs.name || 'Dhaka Stock Exchange Index';

		// Validate symbol
		if (!symbol) {
			console.error('Missing symbol (--code / -c). Example: --code DSEX');
			process.exit(1);
		}

				// Build prompt early so --dry-run can print it without downloading the image
			var prompt = `Analyze ${symbol} (${name}) using only the supplied technical chart data.
			The chart includes all required context and indicators: candles, dates, prices, SMA20, SMA50, volume, RSI14, MACD, summary stats, and optional news.
			Write a detailed Bangla analyst note with specific price action, trend, support/resistance, moving-average, volume, RSI, MACD, risk/reward, entry, target, and stop-loss commentary.
			Speak as a real market analyst making a data-based assessment. Do not mention that you are looking at, seeing, reading, or analyzing a chart/image/screenshot.
			Do not give guaranteed predictions; only technical possibilities.
			Output must follow the requested JSON schema.`;

		if (parsedArgs.verbose) console.log('Generating chart image from OHLC API for:', symbol);

		// If requested, only print the URL/prompt and exit (no network calls)
		if (parsedArgs['dry-run'] || parsedArgs.dryRun || parsedArgs.dry) {
			console.log('\n--- DRY RUN ---');
			console.log('Symbol:', symbol);
			console.log('Name:', name);
			console.log('History API URL:', `https://vip.stocknow.com.bd/v1/instruments/${encodeURIComponent(symbol)}/history?data2=true&resolution=1D&skip=0`);
			console.log('\nPrompt:\n', prompt);
			process.exit(0);
		}

			console.log("Generating chart image from OHLC data…");
			const chartImage = await buildAndCompressChartImage(symbol, name);
			const imageBase64 = chartImage.base64;
    	const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

		// return;
	console.log("Sending to Chat Completion…");
	const response = await client.chat.completions.create({
	    model: "gpt-5.2",
	    messages: [
			{
        role: "system",
        content: [
          { type: "text", text:
            // persona + strict JSON schema + output rules
            "You are an expert stock market analyst. Provide detailed, energetic, data-driven analysis in Bangla. " +
            "Output MUST be valid JSON only (no extra text or commentary). Use the schema exactly as shown. " +
            "Do NOT give guaranteed predictions; present only technical possibilities. " +
            "Write with the confidence and specificity of a real analyst, as if you already know the market data and technical setup. " +
            "Never say or imply that you are seeing, looking at, reading, or analyzing a chart image/screenshot. Avoid phrases like 'চার্টে দেখা যাচ্ছে', 'ছবিতে দেখা যাচ্ছে', 'ইমেজে দেখা যাচ্ছে', 'আমি দেখছি', or similar wording. " +
            "The 'content_html' must be a full 450-700 word Bangla analysis with multiple paragraphs and bullet points. " +
            "Cover price action, trend direction, SMA20/SMA50 position, volume behavior, RSI14, MACD, nearest support, nearest resistance, entry zone, target, stop loss, risk/reward, upside potential, downside risk, and final trading view. " +
            "Use concrete numbers when available from the supplied data. Keep the tone realistic, not robotic.\n\n" +
            "JSON schema:\n" +
            "{\n" +
            "  \"title\": \"<clickbait Bengali title>\",\n" +
            "  \"content_html\": \"<HTML string, full post content in Bangla, use <p>, <ul>, <li> etc.>\",\n" +
            "  \"analysisScore\": <integer 0-100>,\n" +
            "  \"signal\": \"BUY|HOLD|AVOID\",\n" +
            "  \"confidence\": <integer 0-100>,\n" +
            "  \"expectedReturnPercent\": <number>,\n" +
            "  \"maxUpsidePercent\": <number>,\n" +
            "  \"downsideRiskPercent\": <number>,\n" +
            "  \"entryZone\": \"<short price range string>\",\n" +
            "  \"targetPrice\": <number>,\n" +
            "  \"stopLoss\": <number>,\n" +
            "  \"supportLevel\": <number>,\n" +
            "  \"resistanceLevel\": <number>,\n" +
            "  \"riskRewardRatio\": <number>,\n" +
            "  \"breakoutProbability\": <integer 0-100>,\n" +
            "  \"profitProbability\": <integer 0-100>,\n" +
            "  \"riskLevel\": \"low|medium|high\"\n" +
            "}\n\n" +
            "Score rules: analysisScore must estimate probability-adjusted short-term maximum return potential for the next 2 to 5 trading days. " +
            "Higher score means stronger possibility of maximum short-term profit. Use chart probabilities from trend, breakout, volume, RSI, MACD, support/resistance and downside risk. " +
            "0-30 weak, 31-50 neutral/uncertain, 51-70 positive, 71-85 strong, 86-100 exceptional setup. " +
            "Use signal BUY only for strong short-term setups, HOLD for uncertain/neutral setups, and AVOID for weak or high-risk setups. " +
            "All prices and percentages must be plain numbers without currency symbols or percent signs. " +
            "Ensure 'title' is clickbait and hype-driven; 'content_html' must be valid HTML with at least 4 <p> blocks and one <ul> list;" +
            "Return only valid JSON, no extra fields, nothing outside the JSON object."
          }
        ]
      },
				{
				  role: "user",
				  content: [
					{
					  type: "text",
					  text: prompt
					},
					{
					  type: "image_url",
					  image_url: { url: dataUrl, detail: "high" }
				}
			  ]
			}
	  ]
	});

		console.log("\n--- AI Response ---\n");
		console.log(response.choices[0].message.content);

		// Save the AI response to the fixed RESPONSE_DIR folder
		try {
		fs.mkdirSync(RESPONSE_DIR, { recursive: true });
        const safeSymbol = (symbol || 'SYMBOL').replace(/[^a-z0-9_-]/gi, '').toUpperCase() || 'SYMBOL';
        const respFilename = `${safeSymbol}_${Date.now()}.json`;
        const respPath = path.join(RESPONSE_DIR, respFilename);
		var content=response.choices[0].message.content;
		var parsedResponse=JSON.parse(content);
		await updateInstrumentAnalysis(
		  symbol,
		  parsedResponse.title,
		  parsedResponse.content_html,
		  parsedResponse
		);

	 // createWordPressPost(parsedResponse.title, parsedResponse.content_html);
        const out = {
            symbol,
            name,
            prompt,
            response: response,
			parsedResponse,
            receivedAt: new Date().toISOString(),
        };
			fs.writeFileSync(respPath, JSON.stringify(out, null, 2), { encoding: 'utf8' });
			if (parsedArgs.verbose) console.log('Saved AI response to:', respPath);
		} catch (err) {
			console.error('Failed to write AI response file:', err);
		}

	// Cleanup
  } catch (err) {
	console.error("Failed:", err);
  }
}

// Helper: Run analysis in batches (parallel within batch)
async function processInBatches(items, batchSize = 5) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    console.log(`⚡ Running batch ${i / batchSize + 1} (${batch.length} items)`);

    await Promise.all(
      batch.map(async (inst) => {
        try {
          console.log(`📊 Running analysis for ${inst.code} (${inst.name || 'N/A'})`);
          await runSingleAnalysis({
            code: inst.code,
            name: inst.name || inst.code
          });
        } catch (err) {
          console.error(`❌ Failed for ${inst.code}:`, err.message);
        }
      })
    );

    // small delay between batches (API safety)
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function main() {
  try {
    clearTempFilesOnStartup();

    // If a specific code is provided via CLI, prioritize it and run just that one
    if (parsedArgs.code) {
      console.log(`🎯 Targeting specific instrument: ${parsedArgs.code}`);
      await runSingleAnalysis({
        code: parsedArgs.code,
        name: parsedArgs.name || parsedArgs.code
      });
      console.log(`\n✅ Analysis for ${parsedArgs.code} completed.`);
      db.end(); // Use .end() instead of .close() for mysql2 connection
      process.exit(0);
      return;
    }

    const batchLimit = parseInt(parsedArgs.limit || 500);

    if (parsedArgs.verbose) {
      console.log('🔁 Batch analysis mode enabled');
      console.log('Batch size:', batchLimit);
    }

    const instruments = await getInstrumentsForAnalysis(batchLimit);

    if (!instruments.length) {
      console.log('✅ No instruments pending analysis.');
      db.end();
      process.exit(0);
      return;
    }

    const batchSize = parseInt(parsedArgs.batch || 10);

    if (parsedArgs.verbose) {
      console.log('⚙️ Parallel batch size:', batchSize);
    }

    await processInBatches(instruments, batchSize);

    console.log('\n✅ Batch analysis completed.');
    db.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Batch runner failed:', err);
    // Only try to end the connection if it was actually created
    if (db && typeof db.end === 'function') {
      try {
        db.end();
      } catch (e) {
        // Ignore errors during closing
      }
    }
    process.exit(1);
  }
}

main();

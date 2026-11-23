// news-image-20261123 — "The World Today": one front page summing up
// Monday 23 November 2026. Draws a 1024x1024 newspaper front page with a
// hand-written PNG encoder (zlib for compression, hand-rolled CRC32) and a
// hand-written 5x7 bitmap font. No network, no randomness, no time input:
// two runs write byte-identical files.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------- CRC32
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(width: number, height: number, rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    rgb.copy(raw, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ font
// 5x7 bitmap font, each glyph 7 rows of 5 bits (bit 4 = leftmost column).
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14], "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31], "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2], "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14], "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14], "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0], ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8], ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8], "'": [4, 4, 8, 0, 0, 0, 0],
  "-": [0, 0, 0, 14, 0, 0, 0], "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 2, 4, 0, 4], "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8], "/": [1, 1, 2, 4, 8, 16, 16],
  "$": [4, 15, 20, 14, 5, 30, 4], "%": [25, 25, 2, 4, 8, 19, 19],
  "&": [12, 18, 20, 8, 21, 18, 13], "+": [0, 4, 4, 14, 4, 4, 0],
  "=": [0, 0, 14, 0, 14, 0, 0], "*": [0, 4, 21, 14, 21, 4, 0],
  "•": [0, 0, 14, 14, 14, 0, 0],
};

// ---------------------------------------------------------------- canvas
type RGB = [number, number, number];
const PAPER: RGB = [248, 244, 233];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [22, 50, 79];
const RED: RGB = [179, 57, 46];
const TEAL: RGB = [31, 111, 107];
const GOLD: RGB = [200, 155, 60];
const CREAM: RGB = [248, 244, 233];
const GREY: RGB = [110, 105, 90];
const SKY: RGB = [178, 208, 222];
const GREEN: RGB = [74, 124, 74];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Buffer;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c);
    this.fillRect(x + w - t, y, t, h, c);
  }
  hline(x: number, y: number, w: number, c: RGB, t = 1): void {
    this.fillRect(x, y, w, t, c);
  }
  vline(x: number, y: number, h: number, c: RGB, t = 1): void {
    this.fillRect(x, y, t, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) this.set(cx + x, cy + y, c);
  }
  circle(cx: number, cy: number, r: number, c: RGB, t = 2): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      for (let k = 0; k < t; k++)
        this.set(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
    }
  }
  // filled triangle
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const s = ((x - x0) * (y2 - y0) - (y - y0) * (x2 - x0)) / d;
        const t = ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)) / d;
        if (s >= 0 && t >= 0 && s + t <= 1) this.set(x, y, c);
      }
  }
  text(str: string, x: number, y: number, scale: number, c: RGB): number {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch] ?? FONT["?"];
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 5; col++)
          if ((g[row] >> (4 - col)) & 1)
            this.fillRect(cx + col * scale, y + row * scale, scale, scale, c);
      cx += 6 * scale;
    }
    return cx;
  }
  textWidth(str: string, scale: number): number {
    return str.length * 6 * scale - scale;
  }
  center(str: string, y: number, scale: number, c: RGB, x0 = 0, x1: number = this.w): void {
    const w = this.textWidth(str, scale);
    this.text(str, x0 + Math.round((x1 - x0 - w) / 2), y, scale, c);
  }
}

// Word-wrap plain text into lines of at most maxChars characters.
function wrap(str: string, maxChars: number): string[] {
  const words = str.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur.length === 0) cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

// A story block: kicker, headline (wrapped, scale 3), deck (wrapped, scale 2).
function story(cv: Canvas, x: number, y: number, w: number, kicker: string,
  kickerColor: RGB, headline: string, deck: string): number {
  cv.text(kicker, x, y, 2, kickerColor);
  let yy = y + 20;
  const headChars = Math.floor(w / (6 * 3));
  for (const line of wrap(headline, headChars)) {
    cv.text(line, x, yy, 3, INK);
    yy += 24;
  }
  yy += 4;
  const deckChars = Math.floor(w / (6 * 2));
  for (const line of wrap(deck, deckChars)) {
    cv.text(line, x, yy, 2, [64, 60, 52]);
    yy += 17;
  }
  return yy;
}

// ------------------------------------------------------------------ page
function drawPage(): Buffer {
  const W = 1024, H = 1024;
  const cv = new Canvas(W, H, PAPER);

  // ---- masthead
  cv.fillRect(0, 0, W, 118, NAVY);
  cv.center("THE WORLD TODAY", 18, 6, CREAM);
  cv.hline(60, 96, W - 120, GOLD, 3);
  cv.center("MONDAY, 23 NOVEMBER 2026", 102, 2, GOLD);
  cv.hline(0, 118, W, INK, 2);

  // ---- lead story: COP31
  const LX = 36, LW = 560;
  cv.text("CLIMATE  •  ANTALYA, TURKIYE", LX, 138, 2, RED);
  let y = 162;
  for (const line of ["COP31 ENDS", "WITH NO DEAL"]) {
    cv.text(line, LX, y, 5, INK);
    y += 42;
  }
  y += 6;
  const leadDeck = "Nearly 200 nations leave the UN climate summit with no cover " +
    "decision after the longest talks on record. The EU and about 130 countries " +
    "rejected a text with no fossil-fuel phase-out. COP32 goes to Addis Ababa.";
  for (const line of wrap(leadDeck, Math.floor(LW / 12))) {
    cv.text(line, LX, y, 2, [64, 60, 52]);
    y += 18;
  }
  // lead art: globe over a factory skyline, framed
  const AX = 632, AY = 138, AW = 356, AH = 268;
  cv.fillRect(AX, AY, AW, AH, SKY);
  cv.rect(AX, AY, AW, AH, INK, 3);
  cv.disc(AX + 96, AY + 92, 58, [52, 130, 90]);
  cv.circle(AX + 96, AY + 92, 58, [22, 80, 70], 3);
  cv.line(AX + 38, AY + 92, AX + 154, AY + 92, [22, 80, 70]);
  cv.line(AX + 96, AY + 34, AX + 96, AY + 150, [22, 80, 70]);
  cv.line(AX + 52, AY + 52, AX + 140, AY + 132, [22, 80, 70]);
  cv.line(AX + 140, AY + 52, AX + 52, AY + 132, [22, 80, 70]);
  // factory
  cv.fillRect(AX + 210, AY + 150, 120, 66, [70, 70, 74]);
  cv.fillRect(AX + 210, AY + 132, 16, 18, [70, 70, 74]);
  cv.fillRect(AX + 238, AY + 122, 16, 28, [70, 70, 74]);
  cv.tri(AX + 214, AY + 148, AX + 232, AY + 148, AX + 232, AY + 128, [120, 120, 124]);
  cv.tri(AX + 240, AY + 148, AX + 258, AY + 148, AX + 258, AY + 128, [120, 120, 124]);
  // smoke puffs
  cv.disc(AX + 218, AY + 118, 10, [240, 240, 235]);
  cv.disc(AX + 228, AY + 100, 13, [240, 240, 235]);
  cv.disc(AX + 244, AY + 82, 15, [240, 240, 235]);
  cv.disc(AX + 262, AY + 62, 17, [240, 240, 235]);
  // sun
  cv.disc(AX + 300, AY + 52, 22, GOLD);
  cv.text("THE LONGEST CLIMATE", AX + 16, AY + 232, 2, INK);
  cv.text("SUMMIT ENDS EMPTY-HANDED", AX + 16, AY + 250, 2, RED);
  cv.hline(36, 424, W - 72, INK, 2);

  // ---- middle row: three stories
  const cols = [36, 356, 676];
  const cw = 312;
  const mid = [
    { k: "WAR  •  POLAND", kc: RED, h: "MISSILES ENTER POLAND", d: "Poland calls emergency NATO talks for Monday after three Russian cruise missiles cross its border. Bad weather stopped an intercept, Warsaw says." },
    { k: "WAR  •  UKRAINE", kc: RED, h: "KYIV REGION MOURNS", d: "A Russian drone strike wrecks a five-storey block in Dymer. Five dead, nine feared under the rubble. Rescuers pull a child out alive." },
    { k: "USA  •  WASHINGTON", kc: NAVY, h: "DEMOCRATS TAKE 258 SEATS", d: "The largest House majority since 1992. The new majority readies oversight probes as Trump moves to limit what Congress can see." },
  ];
  let midBottom = 0;
  for (let i = 0; i < 3; i++) {
    const s = mid[i];
    // icon strip: small drawn emblem above the story
    const ix = cols[i], iy = 442;
    cv.fillRect(ix, iy, cw, 54, [232, 226, 208]);
    if (i === 0) {
      // shield with star
      cv.tri(ix + 156, iy + 6, ix + 130, iy + 14, ix + 182, iy + 14, NAVY);
      cv.fillRect(ix + 136, iy + 14, 40, 26, NAVY);
      cv.tri(ix + 136, iy + 40, ix + 156, iy + 50, ix + 176, iy + 40, NAVY);
      cv.disc(ix + 156, iy + 26, 6, GOLD);
    } else if (i === 1) {
      // apartment block with a broken top
      cv.fillRect(ix + 128, iy + 12, 56, 38, [90, 88, 84]);
      cv.tri(ix + 128, iy + 12, ix + 146, iy + 2, ix + 156, iy + 12, [90, 88, 84]);
      cv.fillRect(ix + 136, iy + 20, 8, 8, GOLD);
      cv.fillRect(ix + 150, iy + 20, 8, 8, GOLD);
      cv.fillRect(ix + 164, iy + 20, 8, 8, GOLD);
      cv.fillRect(ix + 136, iy + 34, 8, 8, GOLD);
      cv.fillRect(ix + 164, iy + 34, 8, 8, GOLD);
    } else {
      // capitol dome
      cv.fillRect(ix + 128, iy + 34, 56, 16, [90, 88, 84]);
      cv.tri(ix + 132, iy + 34, ix + 156, iy + 8, ix + 180, iy + 34, [90, 88, 84]);
      cv.fillRect(ix + 154, iy + 2, 4, 8, [90, 88, 84]);
      cv.fillRect(ix + 136, iy + 40, 5, 10, [90, 88, 84]);
      cv.fillRect(ix + 153, iy + 40, 5, 10, [90, 88, 84]);
      cv.fillRect(ix + 171, iy + 40, 5, 10, [90, 88, 84]);
    }
    const bottom = story(cv, cols[i], 512, cw, s.k, s.kc, s.h, s.d);
    if (bottom > midBottom) midBottom = bottom;
    if (i < 2) cv.vline(cols[i] + cw + 4, 442, 250, GREY, 1);
  }
  cv.hline(36, 706, W - 72, INK, 2);

  // ---- bottom row: three stories
  const bot = [
    { k: "ASIA  •  NEW DELHI", kc: TEAL, h: "NEPAL PM IN DELHI", d: "Balendra Shah's first trip abroad: deals signed, a new Ayodhya-Janakpur train link opens, and India pledges $1.62bn in flood aid." },
    { k: "ASIA  •  DHAKA", kc: TEAL, h: "GARMENT WAGE STANDOFF", d: "Makers offer about 15% as workers demand 30,000 taka a month. Unrest shuts dozens of factories near Dhaka." },
    { k: "ASIA  •  INDONESIA", kc: RED, h: "FACTORY FIRE: 3 DEAD", d: "A blaze at a sweets factory in Serang kills three workers. At least 36 are still missing as rescuers search the ruins." },
  ];
  for (let i = 0; i < 3; i++) {
    const s = bot[i];
    story(cv, cols[i], 726, cw, s.k, s.kc, s.h, s.d);
    if (i < 2) cv.vline(cols[i] + cw + 4, 726, 220, GREY, 1);
  }

  // ---- footer ticker
  cv.fillRect(0, 962, W, 62, NAVY);
  cv.text("ALSO TODAY:", 36, 978, 2, GOLD);
  cv.text("S. KOREA MINISTER QUITS OVER AI CHEATING  •  TRUMP LEANS TO IRAN STRIKES", 36, 1000, 2, CREAM);

  return encodePNG(W, H, cv.px);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/entry.png`, drawPage());

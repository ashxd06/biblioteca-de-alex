// Copia el worker de PDF.js a /public como archivo estático (webpack/SWC no lo procesa).
// Siempre coincide con la versión instalada de pdfjs-dist.
const fs = require("fs"), path = require("path");
const src = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dst = path.join(__dirname, "..", "public", "pdf.worker.min.mjs");
if (!fs.existsSync(src)) { console.error("No se encontró " + src + " (¿falta npm install?)"); process.exit(1); }
fs.copyFileSync(src, dst); console.log("pdf.worker.min.mjs copiado a public/");

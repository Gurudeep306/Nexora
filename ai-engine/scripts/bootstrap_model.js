#!/usr/bin/env node
/**
 * Kronos-1 Model Bootstrapper
 * Ensures the physical GGUF model weights are present and verified
 * whenever the website is cloned, installed, or deployed.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

const MODELS_DIR = path.resolve(__dirname, '../models');
const DEFAULT_MODEL = 'kronos-coder-0.5b.gguf';
const MODEL_PATH = path.join(MODELS_DIR, DEFAULT_MODEL);
const CDN_URL = 'https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf';

function verifyGguf(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf.toString('ascii') === 'GGUF';
  } catch {
    return false;
  }
}

async function bootstrap() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  // Check if any valid GGUF already exists
  const existing = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.gguf'));
  for (const f of existing) {
    const p = path.join(MODELS_DIR, f);
    if (verifyGguf(p)) {
      const stats = fs.statSync(p);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      console.log(`[⚡ Kronos Bootstrapper] Physical model found and verified: ${f} (${sizeMB} MB)`);
      return;
    }
  }

  console.log('[⚡ Kronos Bootstrapper] No physical model detected in ai-engine/models.');
  console.log(`[⚡ Kronos Bootstrapper] Downloading sovereign Kronos weights to: ${MODEL_PATH}...`);

  const file = fs.createWriteStream(MODEL_PATH);
  
  function download(url) {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location);
      }
      if (res.statusCode !== 200) {
        console.error(`[!] Failed to download Kronos weights: HTTP ${res.statusCode}`);
        file.close();
        try { fs.unlinkSync(MODEL_PATH); } catch (_) {}
        return;
      }

      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;
      let lastLog = 0;

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        file.write(chunk);
        const now = Date.now();
        if (now - lastLog > 3000 && total > 0) {
          lastLog = now;
          const pct = ((downloaded / total) * 100).toFixed(1);
          console.log(`[⚡ Kronos Bootstrapper] Progress: ${pct}% (${(downloaded / (1024 * 1024)).toFixed(1)} / ${(total / (1024 * 1024)).toFixed(1)} MB)`);
        }
      });

      res.on('end', () => {
        file.end();
        console.log('[⚡ Kronos Bootstrapper] Download complete! Verifying integrity...');
        if (verifyGguf(MODEL_PATH)) {
          console.log('[⚡ Kronos Bootstrapper] Integrity verified (GGUF magic byte valid). Model is ready for inference!');
        } else {
          console.warn('[!] Verification warning: check file integrity.');
        }
      });
    }).on('error', (err) => {
      console.error('[!] Download error:', err.message);
      file.close();
      try { fs.unlinkSync(MODEL_PATH); } catch (_) {}
    });
  }

  download(CDN_URL);
}

if (require.main === module) {
  bootstrap().catch(console.error);
}

module.exports = { bootstrap, verifyGguf };

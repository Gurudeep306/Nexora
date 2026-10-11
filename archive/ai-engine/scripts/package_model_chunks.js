#!/usr/bin/env node
/**
 * Kronos Model Chunking and Assembly Utility
 * Splits or reassembles GGUF models into <90MB pieces suitable for direct Git pushes
 * to GitHub without triggering GitHub's 100MB file reject limit (GH001).
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.resolve(__dirname, '../models');
const CHUNK_SIZE = 80 * 1024 * 1024; // 80 MB

function splitModel(filename) {
  const target = path.join(MODELS_DIR, filename);
  if (!fs.existsSync(target)) {
    console.error(`[!] Model file not found: ${target}`);
    return;
  }

  const fd = fs.openSync(target, 'r');
  const buffer = Buffer.alloc(CHUNK_SIZE);
  let part = 0;

  console.log(`[*] Splitting ${filename} into ~80MB GitHub-safe chunks...`);
  while (true) {
    const bytesRead = fs.readSync(fd, buffer, 0, CHUNK_SIZE, null);
    if (bytesRead === 0) break;

    const partName = `${target}.part_${String(part).padStart(3, '0')}`;
    fs.writeFileSync(partName, buffer.subarray(0, bytesRead));
    console.log(`    -> Wrote ${path.basename(partName)} (${(bytesRead / (1024 * 1024)).toFixed(1)} MB)`);
    part++;
  }
  fs.closeSync(fd);
  console.log(`[*] Finished splitting into ${part} parts. All chunks are <100MB and GitHub-safe.`);
}

function assembleModel(filename) {
  const target = path.join(MODELS_DIR, filename);
  const parts = fs.readdirSync(MODELS_DIR)
    .filter(f => f.startsWith(`${filename}.part_`))
    .sort();

  if (parts.length === 0) {
    console.log(`[*] No split parts found for ${filename}. Skipping assembly.`);
    return;
  }

  console.log(`[*] Assembling ${parts.length} parts into ${filename}...`);
  const outFd = fs.openSync(target, 'w');
  for (const p of parts) {
    const pPath = path.join(MODELS_DIR, p);
    const data = fs.readFileSync(pPath);
    fs.writeSync(outFd, data);
    console.log(`    <- Appended ${p}`);
  }
  fs.closeSync(outFd);
  console.log(`[*] Assembly complete! Target model verified: ${target}`);
}

const action = process.argv[2];
const model = process.argv[3] || 'kronos-coder-0.5b.gguf';

if (action === 'split') {
  splitModel(model);
} else if (action === 'assemble') {
  assembleModel(model);
} else {
  console.log('Usage: node package_model_chunks.js [split|assemble] [model_filename]');
}

// Gera stills de prévia para aprovação: node scripts/stills.mjs 60 130 ...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'path';
const frames = process.argv.slice(2).map(Number);
const out = process.env.OUT || path.resolve('../09_PREVIEW/stills');
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const composition = await selectComposition({ serveUrl, id: process.env.COMP || 'PAFIES2027', browserExecutable, inputProps: { withAudio: false } });
for (const frame of frames) {
  await renderStill({ composition, serveUrl, frame, output: `${out}/f${String(frame).padStart(4, '0')}.jpg`, imageFormat: 'jpeg', jpegQuality: 85, browserExecutable, inputProps: { withAudio: false } });
  console.log('still', frame);
}

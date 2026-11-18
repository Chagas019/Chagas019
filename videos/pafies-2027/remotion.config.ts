import { Config } from '@remotion/cli/config';
// Chromium local (sem download) + WebGL por software (ANGLE/SwiftShader) para o three.js
Config.setBrowserExecutable(process.env.REMOTION_CHROME || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(3);

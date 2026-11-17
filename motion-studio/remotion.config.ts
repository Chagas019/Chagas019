// Configuração global do Remotion Studio / CLI. Dono: agente CÓDIGO.
import {Config} from '@remotion/cli/config';
import fs from 'node:fs';

Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(18);
Config.setOverwriteOutput(true);
Config.setConcurrency(null);
// WebGL (cenas 3D) em modo headless.
Config.setChromiumOpenGlRenderer('angle');

// Usa o Chromium headless pré-instalado quando existir (container); localmente o Remotion baixa o seu.
const headless =
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (fs.existsSync(headless)) {
  Config.setBrowserExecutable(headless);
}

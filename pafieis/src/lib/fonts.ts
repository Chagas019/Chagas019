// Fontes locais (public/fonts) — o render não depende de internet.
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const SCRIPT_FONT = 'Great Vibes';
export const DISPLAY_FONT = 'Montserrat';

loadFont({ family: SCRIPT_FONT, url: staticFile('fonts/GreatVibes-400.woff2'), weight: '400' });
for (const w of ['600', '800', '900']) {
  loadFont({ family: DISPLAY_FONT, url: staticFile(`fonts/Montserrat-${w}.woff2`), weight: w });
}

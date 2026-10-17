import { Config } from "@remotion/cli/config";

// Qualidade de entrega: H.264, CRF baixo, cores BT.709.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setAudioCodec("aac");
Config.setAudioBitrate("320k");
Config.setOverwriteOutput(true);
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY) || null);

// Em ambientes sem download do Chrome Headless Shell (ex.: rede restrita),
// aponte para um Chromium já instalado: REMOTION_BROWSER=/caminho/headless_shell
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}

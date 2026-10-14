import { Config } from "@remotion/cli/config";

// Formato de saída e qualidade padrão. Os comandos de render sobrescrevem o que for preciso.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(16);

// Para usar um Chromium já instalado (ex.: no ambiente de render), defina REMOTION_BROWSER
// com o caminho do executável. Sem a variável, o Remotion usa o navegador próprio dele.
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}

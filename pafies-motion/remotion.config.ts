import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
Config.setBrowserExecutable(process.env.REMOTION_CHROME ?? "/opt/pw-browsers/chromium");
Config.setChromiumOpenGlRenderer("swangle");

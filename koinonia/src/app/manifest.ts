import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KOINONIA", short_name: "KOINONIA", description: "Talentos unidos. Uma só missão.",
    start_url: "/", display: "standalone", background_color: "#0A1222", theme_color: "#0A1222",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

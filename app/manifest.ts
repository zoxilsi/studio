import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return {
    name: "JLK Wallpaper Studio", short_name: "JLK Studio",
    description: "Create your own mesh gradient and shape wallpapers.",
    start_url: `${base}/`, scope: `${base}/`, display: "standalone",
    background_color: "#101015", theme_color: "#101015",
    icons: [192, 512].map(size => ({ src: `${base}/icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" })),
  };
}

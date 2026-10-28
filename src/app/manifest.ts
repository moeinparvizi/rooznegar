import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "./",
    name: "روزنگار — برنامه‌ی روز، با واقعیت",
    short_name: "روزنگار",
    description:
      "دفترِ روزهای تو؛ برنامه‌ای آرام که با واقعیت جابه‌جا می‌شود، هرگز صفرت نمی‌کند و هر روز یک گل به باغت اضافه می‌کند.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4efe3",
    theme_color: "#f4efe3",
    lang: "fa",
    dir: "rtl",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: "icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

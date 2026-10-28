import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import { asset } from "@/lib/site";
import "./globals.css";

const vazirArabic = localFont({
  src: "../fonts/vazirmatn-arabic.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-vazir-arabic",
  preload: true,
  fallback: ["Tahoma"],
  adjustFontFallback: false,
});

const vazirLatin = localFont({
  src: "../fonts/vazirmatn-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-vazir-latin",
  preload: true,
  fallback: ["system-ui"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: {
    default: "روزنگار — برنامه‌ی روز، با واقعیت",
    template: "%s · روزنگار",
  },
  description:
    "دفترِ روزهای تو؛ برنامه‌ای سبک و آرام که با واقعیت جابه‌جا می‌شود، هرگز صفرت نمی‌کند و هر روز یک گل به باغت اضافه می‌کند.",
  applicationName: "روزنگار",
  manifest: asset("/manifest.webmanifest"),
  icons: {
    icon: [
      { url: asset("/icon.svg"), type: "image/svg+xml" },
      {
        url: asset("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: asset("/icons/apple-touch-icon.png"),
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "روزنگار",
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe3" },
    { media: "(prefers-color-scheme: dark)", color: "#111713" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('rz-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||((!t||t==='system')&&m);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${vazirArabic.variable} ${vazirLatin.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

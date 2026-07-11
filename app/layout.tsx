import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://studio.zoxilsi.cc"),
  title: "zoxilsi studio",
  description:
    "Design and export beautiful mesh gradients, silky waves, geometric patterns and spotlight backdrops. A GPU-accelerated design studio with OKLab blending, 100+ presets, live effects and one-click export to PNG, video and code.",
  keywords: [
    "mesh gradient",
    "gradient generator",
    "background generator",
    "WebGL",
    "design tool",
    "gradient maker",
    "pattern background",
  ],
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png",   sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png",   sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    shortcut: "/favicon-32.png",
  },
  openGraph: {
    title: "zoxilsi studio",
    description:
      "Design and export beautiful mesh gradients, patterns and backdrops in your browser.",
    url: "https://studio.zoxilsi.cc",
    siteName: "zoxilsi studio",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "zoxilsi studio",
    description:
      "Design and export beautiful mesh gradients, patterns and backdrops in your browser.",
    images: ["/icon-512.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  width: "device-width",
  initialScale: 1,
};

/** Applies the persisted (or system) theme before first paint — no flash. */
const themeScript = `(function(){try{var t=localStorage.getItem("zoxilsi-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "xkvbbjsxxv");
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

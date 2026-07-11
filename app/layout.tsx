import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  openGraph: {
    title: "zoxilsi studio",
    description:
      "Design and export beautiful mesh gradients, patterns and backdrops in your browser.",
    url: "https://studio.zoxilsi.cc",
    siteName: "zoxilsi studio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "zoxilsi studio",
    description:
      "Design and export beautiful mesh gradients, patterns and backdrops in your browser.",
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
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

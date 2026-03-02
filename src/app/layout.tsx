import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DataMug — Private AI Vision Analysis",
    template: "%s | DataMug",
  },
  description:
    "Upload images and get AI-powered analysis using local vision models. OCR, object detection, document analysis, and visual Q&A. Private, fast, free.",
  keywords: [
    "AI",
    "computer vision",
    "image analysis",
    "OCR",
    "Ollama",
    "DataMug",
    "local AI",
    "vision model",
    "private AI",
    "document analysis",
  ],
  metadataBase: new URL("https://mugdata.com"),
  openGraph: {
    title: "DataMug — Private AI Vision Analysis",
    description:
      "Upload images and get AI-powered analysis using local vision models. Private, fast, free.",
    url: "https://mugdata.com",
    siteName: "DataMug",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DataMug — Private AI Vision Analysis",
    description:
      "Upload images and get AI-powered analysis using local vision models.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://mugdata.com",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icons/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DataMug" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

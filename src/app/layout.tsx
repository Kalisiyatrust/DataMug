import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataMug — AI Vision Analysis",
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
  ],
  metadataBase: new URL("https://data-mug.com"),
  openGraph: {
    title: "DataMug — AI Vision Analysis",
    description:
      "Upload images and get AI-powered analysis using local vision models. Private, fast, free.",
    url: "https://data-mug.com",
    siteName: "DataMug",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DataMug — AI Vision Analysis",
    description:
      "Upload images and get AI-powered analysis using local vision models.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

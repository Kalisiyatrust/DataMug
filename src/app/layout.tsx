import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataMug — AI Vision Analysis",
  description:
    "Upload images and get AI-powered analysis using local vision models. OCR, object detection, document analysis, and visual Q&A.",
  keywords: ["AI", "computer vision", "image analysis", "OCR", "Ollama"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

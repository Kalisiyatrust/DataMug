/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Node runtime for API routes (not Edge) to support streaming with Ollama
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Production optimizations
  poweredByHeader: false,

  // Headers for security and caching
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // Cache static assets
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

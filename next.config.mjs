/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Node runtime for API routes (not Edge) to support streaming with Ollama
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

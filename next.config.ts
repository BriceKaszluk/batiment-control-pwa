import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [360, 390, 430, 640, 768, 1024],
    formats: ["image/avif", "image/webp"],
    imageSizes: [64, 128, 256, 384],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;

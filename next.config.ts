import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "sprite-laborer-headband.ngrok-free.dev",
        "*.ngrok-free.dev",
      ],
    },
  },
  // Liberar o HMR do Webpack/Turbopack para domínios cruzados (Ngrok) no Next 16+
  allowedDevOrigins: [
    "sprite-laborer-headband.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
    "*.ngrok.app",
  ],
};

export default nextConfig;

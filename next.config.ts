import type { NextConfig } from "next";

// CI test
const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["https://hunter2.ngrok.dev"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phone / LAN testing against this machine's Wi-Fi IP.
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.10.13"],
  output: "standalone",
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@coach-pocket/shared", "@coach-pocket/core"]
};

export default nextConfig;

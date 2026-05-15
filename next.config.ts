import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "@axe-core/playwright", "exceljs"],
};

export default nextConfig;

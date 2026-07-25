import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Content manifests and source Markdown are read from disk at request time.
  serverExternalPackages: ["yaml"],
  outputFileTracingIncludes: {
    "/read/**": ["./content/source/**/*", "./content/generated/**/*"],
    "/dev/content": ["./content/source/**/*", "./content/generated/**/*"],
  },
};

export default nextConfig;

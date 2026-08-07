import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Silence "inferred workspace root" warning: a stray pnpm-lock.yaml exists
    // in $HOME, so Next would pick /home/dhanxxi as the project root.
    root: process.cwd(),
  },
};

export default nextConfig;

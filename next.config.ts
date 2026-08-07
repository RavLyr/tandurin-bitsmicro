import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Silence "inferred workspace root" warning: a stray pnpm-lock.yaml exists
    // in $HOME, so Next would pick /home/dhanxxi as the project root.
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

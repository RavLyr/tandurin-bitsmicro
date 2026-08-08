import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Silence "inferred workspace root" warning: a stray pnpm-lock.yaml exists
    // in $HOME, so Next would pick /home/dhanxxi as the project root.
    root: process.cwd(),
  },
  // @google/adk's root barrel pulls in a2a/express/mikro-orm subgraphs that the
  // bundler can't resolve (pnpm strict node_modules). Run it native at runtime.
  serverExternalPackages: ["@google/adk"],
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Emits .next/standalone — a self-contained server plus only the node_modules
  // files actually traced as reachable. This is what the Docker image runs.
  output: "standalone",

  // Without this, tracing is rooted at apps/web and stops there. npm workspaces
  // hoist every dependency to the repo root (../../node_modules), so the
  // standalone bundle would ship with none of them and the container would exit
  // on `Cannot find module 'next'`.
  //
  // Resolved from the working directory rather than __dirname, which is not
  // defined when Next loads this config as an ES module. `npm run build` sets the
  // cwd to this workspace directory, and the Dockerfile builds from here too.
  outputFileTracingRoot: path.resolve(process.cwd(), "..", ".."),
};

export default nextConfig;

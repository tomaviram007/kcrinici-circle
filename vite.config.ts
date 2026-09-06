import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";

// A unique id for every build. The bundle carries it as __BUILD_ID__, and the
// same id is written to /version.json next to the bundle. An open tab compares
// the two, and when they differ it knows a newer version has been deployed.
const buildId = (() => {
  let sha = "";
  try {
    sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    // Not a git checkout on the build machine. The timestamp alone is enough.
  }
  return [sha, Date.now().toString(36)].filter(Boolean).join("-");
})();

const versionFile = (): Plugin => ({
  name: "version-file",
  apply: "build",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: JSON.stringify({ build: buildId, at: new Date().toISOString() }),
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [react(), versionFile(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

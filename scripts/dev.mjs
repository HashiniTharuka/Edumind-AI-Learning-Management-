// Interactive dev launcher for EduMind
// Automatically starts in-memory MongoDB (if no Atlas URI configured), seeds demo data, and runs Next.js dev server.
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

async function getMongoUri() {
  // Check if .env.local has a real Atlas URI
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^MONGODB_URI=(.+)$/m);
    if (match) {
      const uri = match[1].trim().replace(/^["']|["']$/g, "");
      if (uri && !uri.includes("<user>") && !uri.includes("<password>")) {
        console.log("Using MongoDB Atlas from .env.local");
        return { uri, stop: async () => {} };
      }
    }
  }

  // Fall back to in-memory MongoDB
  console.log("🚀 Starting local in-memory MongoDB server...");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const server = await MongoMemoryServer.create();
  const uri = server.getUri();
  console.log(`✅ In-memory MongoDB running at ${uri}`);
  return { uri, stop: () => server.stop() };
}

async function runSeed(mongoUri) {
  console.log("🌱 Checking and seeding demo courses & accounts...");
  return new Promise((resolve) => {
    const isWin = process.platform === "win3js" || process.platform === "win32";
    const npxCmd = isWin ? "npx.cmd" : "npx";
    const child = spawn(
      npxCmd,
      ["tsx", "--conditions=react-server", "scripts/seed.ts"],
      {
        env: { ...process.env, MONGODB_URI: mongoUri, NODE_ENV: "development" },
        stdio: "inherit",
        shell: isWin,
      }
    );
    child.on("exit", (code) => {
      if (code === 0) {
        console.log("✅ Demo accounts & courses ready!");
      } else {
        console.warn(`Seed exited with code ${code}, continuing...`);
      }
      resolve();
    });
    child.on("error", (err) => {
      console.warn("Seed process error:", err.message);
      resolve();
    });
  });
}

async function main() {
  const { uri, stop } = await getMongoUri();

  // Seed demo data
  await runSeed(uri);

  console.log("\n⚡ Starting Next.js development server on http://localhost:3000 ...\n");
  const isWin = process.platform === "win32";
  const npxCmd = isWin ? "npx.cmd" : "npx";
  const nextDev = spawn(
    npxCmd,
    ["next", "dev", "-p", "3000"],
    {
      env: {
        ...process.env,
        MONGODB_URI: uri,
        PORT: "3000",
      },
      stdio: "inherit",
      shell: isWin,
    }
  );

  const cleanup = async () => {
    console.log("\nShutting down...");
    nextDev.kill();
    await stop();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  nextDev.on("exit", (code) => {
    stop().then(() => process.exit(code ?? 0));
  });
}

main().catch((err) => {
  console.error("Failed to start EduMind dev environment:", err);
  process.exit(1);
});

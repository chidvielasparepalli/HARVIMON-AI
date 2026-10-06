import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const port = 5199;
const baseUrl = `http://127.0.0.1:${port}`;

const child = spawn(process.execPath, ["src/server.js"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    PORT: String(port),
    CLIENT_ORIGIN: "http://localhost:5173",
    GEMINI_API_KEY: "smoke-test-key",
    GEMINI_LIVE_MODEL: "smoke-test-model",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});

child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

const waitForServer = async () => {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Backend did not start. stdout: ${stdout}\nstderr: ${stderr}`);
};

try {
  await waitForServer();

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.ok, true);
  assert.equal(healthBody.service, "harvimon-ai");
  assert.equal(healthBody.model, "smoke-test-model");

  const voices = await fetch(`${baseUrl}/api/voices`, {
    headers: { Origin: "http://localhost:5173" },
  });
  assert.equal(voices.status, 200);
  assert.equal(voices.headers.get("access-control-allow-origin"), "http://localhost:5173");

  const voiceBody = await voices.json();
  assert.ok(Array.isArray(voiceBody.voices));
  assert.ok(voiceBody.voices.some((voice) => voice.name === "Kore"));

  const blocked = await fetch(`${baseUrl}/api/voices`, {
    headers: { Origin: "https://malicious.example" },
  });
  assert.equal(blocked.status, 500);

  console.log("Backend smoke test passed.");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

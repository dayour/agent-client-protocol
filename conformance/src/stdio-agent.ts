import readline from "node:readline";

import { ReferenceAgent } from "./reference-agent.js";

const faults = [
  ...(process.env.ACP_REFERENCE_MODE === "bad"
    ? ["omit-v1-prompt-stop-reason", "illegal-v2-fs-read-text-file"]
    : []),
  ...(process.env.ACP_REFERENCE_FAULTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0),
];
const agent = new ReferenceAgent(
  faults,
  (line) => {
    process.stdout.write(`${line}\n`);
  },
  (line) => {
    process.stderr.write(`${line}\n`);
  },
);

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", async (line) => {
  await agent.receive(line);
});

rl.on("close", async () => {
  await agent.close();
});

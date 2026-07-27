import readline from 'node:readline';

import { ReferenceAgent } from './reference-agent.js';

const mode = process.env.ACP_REFERENCE_MODE === 'bad' ? 'bad' : 'good';
const agent = new ReferenceAgent(
  mode,
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

rl.on('line', async (line) => {
  await agent.receive(line);
});

rl.on('close', async () => {
  await agent.close();
});

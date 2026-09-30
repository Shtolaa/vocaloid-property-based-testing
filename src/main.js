import { runCli } from './cli.js';

try {
  await runCli();
} catch (error) {
  console.error(`Error inesperado: ${error.message}`);
  process.exitCode = 1;
}

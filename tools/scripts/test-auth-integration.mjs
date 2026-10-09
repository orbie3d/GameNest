import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

const name = `gamenest-auth-test-${randomUUID().slice(0, 8)}`;
const password = randomBytes(32).toString('hex');
let created = false;
const docker = (args, options = {}) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();

try {
  docker(['run', '-d', '--name', name,
    '-e', 'POSTGRES_USER=gamenest_test', '-e', 'POSTGRES_DB=gamenest_test', '-e', 'POSTGRES_PASSWORD',
    '-p', '127.0.0.1::5432', 'postgres:17-alpine'], { env: { ...process.env, POSTGRES_PASSWORD: password } });
  created = true;
  console.log('Started an isolated PostgreSQL container for authentication and migration tests.');
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      docker(['exec', name, 'pg_isready', '-U', 'gamenest_test', '-d', 'gamenest_test']);
      ready = true;
      break;
    } catch {
      await setTimeout(1000);
    }
  }
  if (!ready) throw new Error('Test database did not become ready');
  const port = docker(['inspect', '--format', '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', name]);
  const env = {
    ...process.env, NODE_ENV: 'test', RUN_AUTH_INTEGRATION: 'true', NX_DAEMON: 'false',
    PORT: '3000', CORS_ORIGIN: 'http://localhost:5173',
    POSTGRES_HOST: '127.0.0.1', POSTGRES_PORT: port, POSTGRES_USER: 'gamenest_test',
    POSTGRES_PASSWORD: password, POSTGRES_DB: 'gamenest_test',
    JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
    JWT_ACCESS_TTL_SECONDS: '900', REFRESH_TOKEN_TTL_SECONDS: '2592000',
  };
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'pnpm exec nx test backend --skip-nx-cache --runInBand --testPathPatterns=auth.integration'], { env, stdio: 'inherit' })
    : spawnSync('pnpm', ['exec', 'nx', 'test', 'backend', '--skip-nx-cache', '--runInBand', '--testPathPatterns=auth.integration'], { env, stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} catch {
  console.error('Integration verification failed. Check Docker availability and the test output.');
  process.exitCode = 1;
} finally {
  // Only remove the disposable container created by this invocation.
  if (created) {
    try {
      docker(['rm', '-f', name]);
      console.log('Removed the isolated test database container.');
    } catch {
      console.error(`Unable to remove test container ${name}.`);
      process.exitCode = 1;
    }
  }
}

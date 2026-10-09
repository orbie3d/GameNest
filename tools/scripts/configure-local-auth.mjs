import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'apps/backend/.env';
try {
  let content = readFileSync(path, 'utf8');
  const current = /^JWT_ACCESS_SECRET=(.*)$/m.exec(content)?.[1]?.trim();
  if (current && !current.startsWith('replace-with')) {
    console.log('A local JWT secret is already configured; it was preserved.');
  } else {
    const line = `JWT_ACCESS_SECRET=${randomBytes(48).toString('hex')}`;
    content = /^JWT_ACCESS_SECRET=.*$/m.test(content)
      ? content.replace(/^JWT_ACCESS_SECRET=.*$/m, line)
      : `${content.trimEnd()}\n${line}\n`;
    writeFileSync(path, content);
    console.log('A private JWT secret was generated in apps/backend/.env.');
  }
} catch {
  console.error('Unable to configure authentication. Create apps/backend/.env from .env.example first.');
  process.exitCode = 1;
}

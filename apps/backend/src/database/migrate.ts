import 'reflect-metadata';
import { loadEnvFile } from 'node:process';
import { DataSource } from 'typeorm';
import { environmentFile, validateEnvironment } from '../app/environment';
import { databaseOptions } from './database-options';

async function migrate(): Promise<void> {
  const operation = process.argv[2];
  if (operation !== 'run' && operation !== 'revert') throw new Error('Expected migration operation: run or revert');
  const file = environmentFile();
  if (file) loadEnvFile(file);
  const source = new DataSource(databaseOptions(validateEnvironment(process.env)));
  await source.initialize();
  try {
    if (operation === 'run') {
      const applied = await source.runMigrations({ transaction: 'all' });
      console.log(`Applied ${applied.length} migration(s).`);
    } else {
      await source.undoLastMigration({ transaction: 'all' });
      console.log('Reverted the last migration.');
    }
  } finally {
    await source.destroy();
  }
}

migrate().catch(() => {
  console.error('Migration failed. Check configuration, database availability and migration history.');
  process.exitCode = 1;
});

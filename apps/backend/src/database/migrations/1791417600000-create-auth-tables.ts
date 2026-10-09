import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1791417600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        email varchar(254) NOT NULL,
        display_name varchar(80) NOT NULL,
        password_hash text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_email_unique UNIQUE (email),
        CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email))),
        CONSTRAINT users_display_name_length CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 80)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE auth_sessions (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash char(64) NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT auth_sessions_refresh_hash_unique UNIQUE (refresh_token_hash),
        CONSTRAINT auth_sessions_refresh_hash_format CHECK (refresh_token_hash ~ '^[0-9a-f]{64}$'),
        CONSTRAINT auth_sessions_expiration CHECK (expires_at > created_at)
      )
    `);
    await queryRunner.query('CREATE INDEX auth_sessions_user_id_idx ON auth_sessions(user_id)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE auth_sessions');
    await queryRunner.query('DROP TABLE users');
  }
}

import type { DbClient } from '../db/client.js';
import type { AdminSession, Administrator } from '../types/domain.js';

interface AdministratorRow {
  id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapAdminRow(row: AdministratorRow): Administrator {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findAdministratorByEmail(
  client: DbClient,
  email: string,
): Promise<Administrator | null> {
  const result = await client.query<AdministratorRow>(
    'SELECT * FROM administrators WHERE email = $1',
    [email.toLowerCase()],
  );
  return result.rows[0] ? mapAdminRow(result.rows[0]) : null;
}

export async function findAdministratorById(
  client: DbClient,
  id: string,
): Promise<Administrator | null> {
  const result = await client.query<AdministratorRow>('SELECT * FROM administrators WHERE id = $1', [
    id,
  ]);
  return result.rows[0] ? mapAdminRow(result.rows[0]) : null;
}

export async function insertAdministrator(
  client: DbClient,
  email: string,
  passwordHash: string,
): Promise<Administrator> {
  const result = await client.query<AdministratorRow>(
    `INSERT INTO administrators (email, password_hash) VALUES ($1, $2) RETURNING *`,
    [email.toLowerCase(), passwordHash],
  );
  return mapAdminRow(result.rows[0]!);
}

export async function touchAdministratorLastLogin(client: DbClient, id: string): Promise<void> {
  await client.query('UPDATE administrators SET last_login_at = now() WHERE id = $1', [id]);
}

interface AdminSessionRow {
  id: string;
  administrator_id: string;
  session_token_hash: string;
  csrf_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

function mapSessionRow(row: AdminSessionRow): AdminSession {
  return {
    id: row.id,
    administratorId: row.administrator_id,
    sessionTokenHash: row.session_token_hash,
    csrfTokenHash: row.csrf_token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export async function insertAdminSession(
  client: DbClient,
  administratorId: string,
  sessionTokenHash: string,
  csrfTokenHash: string,
  expiresAt: Date,
): Promise<AdminSession> {
  const result = await client.query<AdminSessionRow>(
    `INSERT INTO admin_sessions (administrator_id, session_token_hash, csrf_token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [administratorId, sessionTokenHash, csrfTokenHash, expiresAt],
  );
  return mapSessionRow(result.rows[0]!);
}

export async function findActiveSessionByTokenHash(
  client: DbClient,
  sessionTokenHash: string,
): Promise<AdminSession | null> {
  const result = await client.query<AdminSessionRow>(
    `SELECT * FROM admin_sessions
     WHERE session_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [sessionTokenHash],
  );
  return result.rows[0] ? mapSessionRow(result.rows[0]) : null;
}

export async function revokeSessionByTokenHash(client: DbClient, sessionTokenHash: string): Promise<void> {
  await client.query(
    'UPDATE admin_sessions SET revoked_at = now() WHERE session_token_hash = $1 AND revoked_at IS NULL',
    [sessionTokenHash],
  );
}

export async function deleteExpiredSessions(client: DbClient): Promise<number> {
  const result = await client.query(
    "DELETE FROM admin_sessions WHERE expires_at < now() - INTERVAL '7 days'",
  );
  return result.rowCount ?? 0;
}

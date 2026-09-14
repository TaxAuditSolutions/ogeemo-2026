/**
 * Sanitized SMTP auth diagnostics for the Ogeemo notification mailbox.
 * NEVER prints the password — only length/character-class facts.
 *
 * Usage: npx tsx scripts/diag-smtp-auth.ts
 */
import fs from 'node:fs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config({ path: '.env.local' });

const text = fs.readFileSync('.env.local', 'utf8');
const line = text.split(/\r?\n/).find((l) => l.startsWith('SMTP_PASS='));
const raw = line ? line.slice('SMTP_PASS='.length) : '';
const parsed = process.env.SMTP_PASS || '';

const describe = (name: string, v: string) =>
  console.log(
    `${name}: length=${v.length} leadingSpace=${v !== v.trimStart()} trailingSpace=${v !== v.trimEnd()} quotes=${/["']/.test(
      v
    )} hash=${v.includes('#')} dollar=${v.includes('$')} backslash=${v.includes('\\')}`
  );

describe('raw .env.local line', raw);
describe('value after dotenv  ', parsed);
console.log('identical:', raw === parsed);
console.log('username:', process.env.SMTP_USER, '| host:', process.env.SMTP_HOST);

const user = process.env.SMTP_USER || '';
const pass = parsed;

async function tryPort(port: number, secure: boolean): Promise<boolean> {
  const transport = nodemailer.createTransport({
    host: 'mail.ogeemo.com',
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 20000,
    tls: { rejectUnauthorized: false },
  });
  try {
    await transport.verify();
    console.log(`PORT ${port}: AUTH OK`);
    return true;
  } catch (error: any) {
    console.log(`PORT ${port}: ${error.message}`);
    return false;
  }
}

async function main() {
  await tryPort(465, true); // implicit SSL — the documented port
  await tryPort(587, false); // STARTTLS fallback, same credentials
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

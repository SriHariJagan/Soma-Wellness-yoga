#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envPath = path.join(root, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  const v = t.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const info = await transporter.sendMail({
  from: '"SomaWellness" <pragyayogainfo@gmail.com>',
  to: 'srihariajagan04@gmail.com',
  subject: 'SomaWellness — SMTP Test',
  html: '<h1 style="color:#C8956C;">SomaWellness</h1><p>This is a test email. If you received this, SMTP is working.</p>',
  text: 'SomaWellness — Test Email. If you received this, SMTP is working.',
});

console.log('MessageId:', info.messageId);
console.log('Response:', info.response);
console.log('Accepted:', info.accepted);
console.log('Rejected:', info.rejected);

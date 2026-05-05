import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = process.env.PORT || 8787;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));
}

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function fallbackAvatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Nguoi Moi')}&background=EEDC82&color=8B4513`;
}

function sanitizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40);
}

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  const displayName = sanitizeName(req.body?.displayName);
  if (!displayName) {
    return res.status(400).send('Thiếu displayName');
  }

  const db = readDb();
  const requestedUid = String(req.body?.uid || '').trim();
  const uid = requestedUid && db.users[requestedUid]
    ? requestedUid
    : `user_${crypto.randomBytes(6).toString('hex')}`;

  const existing = db.users[uid] || {};
  const user = {
    uid,
    displayName,
    photoURL: req.body?.photoURL || existing.photoURL || fallbackAvatar(displayName),
    merit: Number(existing.merit || 0),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.users[uid] = user;
  writeDb(db);
  res.json(user);
});

app.get('/api/users/:uid', (req, res) => {
  const db = readDb();
  const user = db.users[req.params.uid];
  if (!user) return res.status(404).send('Không tìm thấy user');
  res.json(user);
});

app.get('/api/score/:uid', (req, res) => {
  const db = readDb();
  const user = db.users[req.params.uid];
  if (!user) return res.json({ merit: 0 });
  res.json({ merit: Number(user.merit || 0) });
});

app.post('/api/score', (req, res) => {
  const uid = String(req.body?.uid || '').trim();
  const merit = Number(req.body?.merit || 0);
  if (!uid) return res.status(400).send('Thiếu uid');
  if (!Number.isFinite(merit) || merit < 0) return res.status(400).send('Merit không hợp lệ');

  const db = readDb();
  const user = db.users[uid];
  if (!user) return res.status(404).send('Không tìm thấy user');

  user.merit = Math.floor(merit);
  user.updatedAt = new Date().toISOString();
  db.users[uid] = user;
  writeDb(db);
  res.json({ ok: true, merit: user.merit });
});

app.get('/api/leaderboard', (_req, res) => {
  const db = readDb();
  const users = Object.values(db.users)
    .sort((a, b) => Number(b.merit || 0) - Number(a.merit || 0))
    .slice(0, 100);
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`Tich Cong Duc backend listening on http://0.0.0.0:${PORT}`);
});

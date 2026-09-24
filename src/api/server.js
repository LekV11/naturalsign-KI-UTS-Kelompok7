/**
 * NaturalSign - Express Server Entry Point
 * Anggota Penanggung Jawab: Modul 3 (Backend API & UI Integration)
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { apiRouter } from './routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static files for Web UI
const uiPath = path.join(__dirname, '..', 'ui');
app.use(express.static(uiPath));

// API Router
app.use('/api', apiRouter);

// Fallback index
app.get('*', (req, res) => {
  res.sendFile(path.join(uiPath, 'index.html'));
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`\n========================================================`);
  console.log(`  NaturalSign - Sistem Tanda Tangan Digital & Verifikasi QR`);
  console.log(`  Universitas Siliwangi (UTS Keamanan Informasi)`);
  console.log(`  Server aktif di : http://localhost:${PORT}`);
  console.log(`========================================================\n`);
});

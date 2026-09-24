/**
 * Unit Test 5: Uji QR Payload & Deteksi QR Palsu (Forged QR Test)
 * Sesuai Kriteria Section 3.4 & 4.5
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair } from '../src/crypto/keygen.js';
import { signDocument } from '../src/crypto/signer.js';
import { verifyDocument, VERIFICATION_STATUS } from '../src/crypto/verifier.js';
import { buildQRPayload, parseQRPayload, generateQRBuffer } from '../src/qrcode/qrEngine.js';

describe('Modul 2: Integritas QR-Code & Uji QR Palsu', () => {
  const keys = generateKeyPair();
  const document = Buffer.from('Lembar Pengesahan Laporan Akhir Praktikum');
  const { docHash, signature } = signDocument(document, keys.privateKey);

  test('Membangun payload QR dan parsing kembali harus valid & utuh', () => {
    const payload = buildQRPayload({
      signerName: 'Dr. Ahmad Fauzi, S.T., M.T.',
      role: 'Ketua Jurusan Informatika',
      institution: 'Universitas Siliwangi',
      docHash,
      signature
    });

    const parsed = parseQRPayload(JSON.stringify(payload));
    assert.equal(parsed.isValidFormat, true);
    assert.equal(parsed.payload.signer.name, 'Dr. Ahmad Fauzi, S.T., M.T.');
    assert.equal(parsed.payload.doc.hash, docHash);
    assert.equal(parsed.payload.sig, signature);
  });

  test('Generate QR image buffer harus menghasilkan binary PNG valid', async () => {
    const payload = buildQRPayload({
      signerName: 'Dr. Ahmad Fauzi',
      role: 'Ketua Jurusan',
      institution: 'Universitas Siliwangi',
      docHash,
      signature
    });

    const qrBuffer = await generateQRBuffer(payload);
    assert.ok(Buffer.isBuffer(qrBuffer));
    // Header magic number PNG: 89 50 4E 47
    assert.equal(qrBuffer[0], 0x89);
    assert.equal(qrBuffer[1], 0x50);
    assert.equal(qrBuffer[2], 0x4E);
    assert.equal(qrBuffer[3], 0x47);
  });

  test('Uji QR Palsu: Mengubah metadata atau signature di dalam QR HARUS GAGAL saat diverifikasi', () => {
    // Penyerang membuat QR payload tetapi mengubah nama atau isi signature
    const forgedPayload = buildQRPayload({
      signerName: 'Penyerang Palsu', // Data dipalsukan
      role: 'Dekan Palsu',
      institution: 'Institusi Palsu',
      docHash: docHash, // Menggunakan hash dokumen korban
      signature: Buffer.from('ForgedSignatureValueHere12345').toString('base64') // Signature palsu
    });

    // Pihak verifikator memverifikasi dokumen asli dengan signature dari QR palsu
    const result = verifyDocument(
      document,
      forgedPayload.doc.hash,
      forgedPayload.sig,
      keys.publicKey
    );

    // Kriteria penilaian wajib: HARUS GAGAL
    assert.equal(result.isValid, false);
    assert.equal(result.status, VERIFICATION_STATUS.INVALID_KEY);
  });
});

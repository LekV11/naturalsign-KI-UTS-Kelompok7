/**
 * Integration Test: End-to-End PDF Sign, Embed, and Verify Flow
 * Sesuai Kriteria Section 9: Skenario Demo UTS
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { generateKeyPair } from '../src/crypto/keygen.js';
import { verifyDocument, VERIFICATION_STATUS } from '../src/crypto/verifier.js';
import { signAndEmbedPDF, extractSignatureFromPDF } from '../src/pdf/pdfEngine.js';

describe('Integrasi End-to-End: Alur Sign & Verify PDF Ber-QR-Code', () => {
  const samplePdfPath = path.join(process.cwd(), 'sample-data', 'surat_keterangan_sample.pdf');
  const samplePdfBuffer = fs.readFileSync(samplePdfPath);
  const keys = generateKeyPair();

  test('1. Menandatangani PDF & menyematkan visual QR Badge', async () => {
    const signResult = await signAndEmbedPDF(
      samplePdfBuffer,
      {
        signerName: 'Prof. Dr. Sutisna',
        role: 'Dekan FT',
        institution: 'Universitas Siliwangi'
      },
      keys.privateKey,
      keys.publicKey
    );

    assert.ok(signResult.signedPdfBytes instanceof Uint8Array);
    assert.ok(signResult.docHash.length === 64);
    assert.ok(signResult.signature.length > 20);
    assert.ok(signResult.qrDataUrl.startsWith('data:image/png;base64,'));

    // 2. Ekstraksi metadata dari PDF harus sukses
    const extracted = await extractSignatureFromPDF(signResult.signedPdfBytes);
    assert.ok(extracted !== null);
    assert.equal(extracted.doc.hash, signResult.docHash);
    assert.equal(extracted.sig, signResult.signature);
    assert.equal(extracted.signer.name, 'Prof. Dr. Sutisna');

    // 3. Verifikasi dokumen asli dengan hash & signature yang tersemat
    const verification = verifyDocument(
      samplePdfBuffer,
      extracted.doc.hash,
      extracted.sig,
      keys.publicKey
    );
    assert.equal(verification.isValid, true);
    assert.equal(verification.status, VERIFICATION_STATUS.VALID);
  });

  test('2. Skenario Demo: Ubah isi dokumen (Tamper) -> HARUS GAGAL', async () => {
    const signResult = await signAndEmbedPDF(
      samplePdfBuffer,
      { signerName: 'Prof. Sutisna', role: 'Dekan', institution: 'UNSIL' },
      keys.privateKey,
      keys.publicKey
    );

    // Salin buffer dan modifikasi 1 byte
    const tamperedPdf = Buffer.from(samplePdfBuffer);
    tamperedPdf[tamperedPdf.length - 50] ^= 0xFF;

    const verification = verifyDocument(
      tamperedPdf,
      signResult.docHash,
      signResult.signature,
      keys.publicKey
    );

    assert.equal(verification.isValid, false);
    assert.equal(verification.status, VERIFICATION_STATUS.TAMPERED);
  });

  test('3. Skenario Demo: Verifikasi dengan Kunci Salah -> HARUS GAGAL', async () => {
    const anotherKeys = generateKeyPair();
    const signResult = await signAndEmbedPDF(
      samplePdfBuffer,
      { signerName: 'Prof. Sutisna', role: 'Dekan', institution: 'UNSIL' },
      keys.privateKey,
      keys.publicKey
    );

    const verification = verifyDocument(
      samplePdfBuffer,
      signResult.docHash,
      signResult.signature,
      anotherKeys.publicKey // Kunci salah
    );

    assert.equal(verification.isValid, false);
    assert.equal(verification.status, VERIFICATION_STATUS.INVALID_KEY);
  });
});

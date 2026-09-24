/**
 * Integration Test: End-to-End PDF Sign, Embed, and Verify Flow
 * Sesuai Kriteria Section 9: Skenario Demo UTS & Penanganan Dokumen Bertanda Tangan
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { generateKeyPair, SUPPORTED_ALGORITHMS } from '../src/crypto/keygen.js';
import { verifyDocument, VERIFICATION_STATUS } from '../src/crypto/verifier.js';
import { signAndEmbedPDF, extractSignatureFromPDF, extractProtectedContent } from '../src/pdf/pdfEngine.js';

describe('Integrasi End-to-End: Alur Sign & Verify PDF Ber-QR-Code', () => {
  const samplePdfPath = path.join(process.cwd(), 'sample-data', 'surat_keterangan_sample.pdf');
  const samplePdfBuffer = fs.readFileSync(samplePdfPath);
  const keys = generateKeyPair(SUPPORTED_ALGORITHMS.ECDSA_P256);

  test('TEST 1: PDF Asli -> Sign -> Masukkan PDF Signed Langsung ke Verify -> HARUS VALID', async () => {
    // 1. Sign PDF Asli
    const signResult = await signAndEmbedPDF(
      samplePdfBuffer,
      {
        signerName: 'Prof. Dr. Sutisna',
        role: 'Dekan FT',
        institution: 'Universitas Siliwangi'
      },
      keys.privateKey,
      keys.publicKey,
      SUPPORTED_ALGORITHMS.ECDSA_P256
    );

    assert.ok(signResult.signedPdfBytes instanceof Uint8Array || Buffer.isBuffer(signResult.signedPdfBytes));
    assert.ok(signResult.docHash.length === 64);
    assert.ok(signResult.signature.length > 20);

    // 2. Verifikasi langsung menggunakan PDF SIGNED hasil proses signing
    const signedPdfBuffer = Buffer.from(signResult.signedPdfBytes);
    
    // Ekstraksi signature dari PDF signed
    const extractedSig = await extractSignatureFromPDF(signedPdfBuffer);
    assert.ok(extractedSig !== null);
    assert.equal(extractedSig.doc.hash, signResult.docHash);
    assert.equal(extractedSig.sig, signResult.signature);

    // Ekstraksi protected content dari PDF signed
    const { protectedDocBuffer, isContainerTampered } = extractProtectedContent(signedPdfBuffer);
    assert.equal(isContainerTampered, false);

    // Verifikasi kriptografis terhadap dokumen yang diekstrak dari paket signed
    const verification = verifyDocument(
      protectedDocBuffer,
      extractedSig.doc.hash,
      extractedSig.sig,
      keys.publicKey,
      SUPPORTED_ALGORITHMS.ECDSA_P256,
      isContainerTampered
    );

    assert.equal(verification.isValid, true);
    assert.equal(verification.status, VERIFICATION_STATUS.VALID);
    assert.ok(verification.message.includes('VERIFIKASI BERHASIL'));
  });

  test('TEST 2: PDF Signed Asli -> Ubah 1 Byte -> Verify -> HARUS TAMPERED', async () => {
    const signResult = await signAndEmbedPDF(
      samplePdfBuffer,
      { signerName: 'Prof. Sutisna', role: 'Dekan', institution: 'UNSIL' },
      keys.privateKey,
      keys.publicKey
    );

    // Tamper 1: Modifikasi 1 byte pada file PDF signed
    const tamperedPdf = Buffer.from(signResult.signedPdfBytes);
    tamperedPdf[tamperedPdf.length - 20] ^= 0x01; // flip 1 bit

    const extractedSig = await extractSignatureFromPDF(tamperedPdf);
    const { protectedDocBuffer, isContainerTampered } = extractProtectedContent(tamperedPdf);

    const verification = verifyDocument(
      protectedDocBuffer,
      signResult.docHash,
      signResult.signature,
      keys.publicKey,
      SUPPORTED_ALGORITHMS.ECDSA_P256,
      isContainerTampered
    );

    assert.equal(verification.isValid, false);
    assert.equal(verification.status, VERIFICATION_STATUS.TAMPERED);
    assert.ok(verification.message.includes('DOKUMEN TELAH DIUBAH'));
  });

  test('TEST 3: PDF Signed Asli -> Gunakan Public Key dari Key Pair LAIN -> HARUS INVALID_KEY', async () => {
    const otherKeys = generateKeyPair(SUPPORTED_ALGORITHMS.ECDSA_P256);
    const signResult = await signAndEmbedPDF(
      samplePdfBuffer,
      { signerName: 'Prof. Sutisna', role: 'Dekan', institution: 'UNSIL' },
      keys.privateKey,
      keys.publicKey
    );

    const signedPdfBuffer = Buffer.from(signResult.signedPdfBytes);
    const { protectedDocBuffer, isContainerTampered } = extractProtectedContent(signedPdfBuffer);

    // Verifikasi dengan otherKeys.publicKey (kunci salah)
    const verification = verifyDocument(
      protectedDocBuffer,
      signResult.docHash,
      signResult.signature,
      otherKeys.publicKey, // KUNCI SALAH
      SUPPORTED_ALGORITHMS.ECDSA_P256,
      isContainerTampered
    );

    assert.equal(verification.isValid, false);
    assert.equal(verification.status, VERIFICATION_STATUS.INVALID_KEY);
    assert.ok(verification.message.includes('KUNCI TIDAK COCOK'));
  });

  test('TEST 4: PDF Signed Asli -> Ubah Signature / QR Secara Tidak Sah -> HARUS DITOLAK', async () => {
    const signResult = await signAndEmbedPDF(
      samplePdfBuffer,
      { signerName: 'Prof. Sutisna', role: 'Dekan', institution: 'UNSIL' },
      keys.privateKey,
      keys.publicKey
    );

    const signedPdfBuffer = Buffer.from(signResult.signedPdfBytes);
    const { protectedDocBuffer, isContainerTampered } = extractProtectedContent(signedPdfBuffer);

    // Signature dipalsukan
    const forgedSignature = Buffer.from('ForgedSignatureValueXYZ12345').toString('base64');

    const verification = verifyDocument(
      protectedDocBuffer,
      signResult.docHash,
      forgedSignature,
      keys.publicKey,
      SUPPORTED_ALGORITHMS.ECDSA_P256,
      isContainerTampered
    );

    assert.equal(verification.isValid, false);
    assert.equal(verification.status, VERIFICATION_STATUS.INVALID_KEY);
  });

  test('TEST 5: PDF Signed Asli -> Verify Berulang Kali -> Hasil Konsisten VALID', async () => {
    const signResult = await signAndEmbedPDF(
      samplePdfBuffer,
      { signerName: 'Prof. Sutisna', role: 'Dekan', institution: 'UNSIL' },
      keys.privateKey,
      keys.publicKey
    );

    const signedPdfBuffer = Buffer.from(signResult.signedPdfBytes);

    for (let i = 0; i < 5; i++) {
      const { protectedDocBuffer, isContainerTampered } = extractProtectedContent(signedPdfBuffer);
      const verification = verifyDocument(
        protectedDocBuffer,
        signResult.docHash,
        signResult.signature,
        keys.publicKey,
        SUPPORTED_ALGORITHMS.ECDSA_P256,
        isContainerTampered
      );
      assert.equal(verification.isValid, true);
      assert.equal(verification.status, VERIFICATION_STATUS.VALID);
    }
  });

  test('TEST 6 & 7: Skema RSA-PSS 2048-bit Sign & Verify PDF', async () => {
    const rsaKeys = generateKeyPair(SUPPORTED_ALGORITHMS.RSA_PSS_2048);
    const signResult = await signAndEmbedPDF(
      samplePdfBuffer,
      { signerName: 'Rektor UNSIL', role: 'Rektor', institution: 'UNSIL' },
      rsaKeys.privateKey,
      rsaKeys.publicKey,
      SUPPORTED_ALGORITHMS.RSA_PSS_2048
    );

    const signedPdfBuffer = Buffer.from(signResult.signedPdfBytes);
    const { protectedDocBuffer, isContainerTampered } = extractProtectedContent(signedPdfBuffer);

    const verification = verifyDocument(
      protectedDocBuffer,
      signResult.docHash,
      signResult.signature,
      rsaKeys.publicKey,
      SUPPORTED_ALGORITHMS.RSA_PSS_2048,
      isContainerTampered
    );

    assert.equal(verification.isValid, true);
    assert.equal(verification.status, VERIFICATION_STATUS.VALID);
  });
});

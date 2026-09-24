/**
 * Unit Test 4: Uji Verifikasi dengan Kunci Publik Salah (Wrong Key Test)
 * Sesuai Kriteria Section 3.3.b & 4.4
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair } from '../src/crypto/keygen.js';
import { signDocument } from '../src/crypto/signer.js';
import { verifyDocument, VERIFICATION_STATUS } from '../src/crypto/verifier.js';

describe('Uji Otentikasi: Kunci Publik Salah / Pihak Ketiga', () => {
  test('Verifikasi menggunakan Public Key pasangan kunci LAIN HARUS GAGAL (INVALID_KEY)', () => {
    // Pasangan kunci resmi penandatangan (A)
    const legitKeys = generateKeyPair();
    
    // Pasangan kunci penyerang / pihak lain (B)
    const imposterKeys = generateKeyPair();

    const documentBuffer = Buffer.from('SERTIFIKAT KELULUSAN KOMPETENSI KEAMANAN INFORMASI');

    // Dokumen ditandatangani oleh A
    const { docHash, signature } = signDocument(documentBuffer, legitKeys.privateKey);

    // Verifikasi menggunakan kunci publik B (kunci yang salah)
    const result = verifyDocument(documentBuffer, docHash, signature, imposterKeys.publicKey);

    // Kriteria penilaian wajib: HARUS GAGAL
    assert.equal(result.isValid, false);
    assert.equal(result.status, VERIFICATION_STATUS.INVALID_KEY);
    assert.ok(result.message.includes('KUNCI TIDAK COCOK'));
  });
});

/**
 * Unit Test 3: Uji Tamper Dokumen (1-Byte Modification)
 * Sesuai Kriteria Section 3.3.a & 4.3
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair } from '../src/crypto/keygen.js';
import { signDocument } from '../src/crypto/signer.js';
import { verifyDocument, VERIFICATION_STATUS } from '../src/crypto/verifier.js';

describe('Uji Integritas Dokumen: Uji Tamper (Modifikasi 1 Byte)', () => {
  test('Mengubah 1 byte pada isi dokumen HARUS menyebabkan verifikasi GAGAL (TAMPERED)', () => {
    const keys = generateKeyPair();
    const originalDocument = Buffer.from('SURAT KEPUTUSAN REKTOR UNIVERSITAS SILIWANGI NO 123/2026: LULUS');
    
    // Tanda tangani dokumen asli
    const { docHash, signature } = signDocument(originalDocument, keys.privateKey);

    // Pastikan dokumen asli sebelum dimodifikasi lulus verifikasi
    const verifyOriginal = verifyDocument(originalDocument, docHash, signature, keys.publicKey);
    assert.equal(verifyOriginal.isValid, true);
    assert.equal(verifyOriginal.status, VERIFICATION_STATUS.VALID);

    // Lakukan tamper: ubah 1 byte (misal karakter terakhir 'S' (83) menjadi 'T' (84))
    const tamperedDocument = Buffer.from(originalDocument);
    tamperedDocument[tamperedDocument.length - 1] ^= 0x01; // flip 1 bit

    // Jalankan verifikasi pada dokumen yang telah di-tamper
    const verifyTampered = verifyDocument(tamperedDocument, docHash, signature, keys.publicKey);

    // Kriteria penilaian wajib: HARUS GAGAL
    assert.equal(verifyTampered.isValid, false);
    assert.equal(verifyTampered.status, VERIFICATION_STATUS.TAMPERED);
    assert.ok(verifyTampered.message.includes('DOKUMEN TELAH DIUBAH'));
  });
});

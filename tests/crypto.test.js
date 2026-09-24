/**
 * Unit Test 1: Modul Kriptografi (Keygen, Sign, Verify)
 * Sesuai Kriteria Section 3.1, 3.2, 3.3
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SUPPORTED_ALGORITHMS } from '../src/crypto/keygen.js';
import { computeSHA256, signHash, signDocument } from '../src/crypto/signer.js';
import { verifyHash, verifyDocument, VERIFICATION_STATUS } from '../src/crypto/verifier.js';

describe('Modul 1: Kriptografi Dasar', () => {
  test('Keygen harus menghasilkan pasangan kunci valid dengan CSPRNG (ECDSA P-256)', () => {
    const keys = generateKeyPair(SUPPORTED_ALGORITHMS.ECDSA_P256);
    assert.ok(keys.publicKey.includes('BEGIN PUBLIC KEY'));
    assert.ok(keys.privateKey.includes('BEGIN PRIVATE KEY'));
    assert.equal(keys.algorithm, SUPPORTED_ALGORITHMS.ECDSA_P256);
  });

  test('Hash SHA-256 harus konsisten & berukuran 64 karakter hex', () => {
    const data = Buffer.from('NaturalSign Test Document Content');
    const hash1 = computeSHA256(data);
    const hash2 = computeSHA256(data);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });

  test('Sign & Verify harus SUKSES pada dokumen utuh', () => {
    const keys = generateKeyPair();
    const docBuffer = Buffer.from('Dokumen Resmi Universitas Siliwangi 2026');

    const { docHash, signature } = signDocument(docBuffer, keys.privateKey);
    const result = verifyDocument(docBuffer, docHash, signature, keys.publicKey);

    assert.equal(result.isValid, true);
    assert.equal(result.status, VERIFICATION_STATUS.VALID);
  });

  test('Verifikasi harus GAGAL jika tanda tangan korup atau diubah', () => {
    const keys = generateKeyPair();
    const docBuffer = Buffer.from('Surat Pengesahan Asli');
    const { docHash } = signDocument(docBuffer, keys.privateKey);

    // Signature sembarang/korup
    const corruptSignature = Buffer.from('CorruptedFakeSignature').toString('base64');
    const result = verifyDocument(docBuffer, docHash, corruptSignature, keys.publicKey);

    assert.equal(result.isValid, false);
    assert.equal(result.status, VERIFICATION_STATUS.INVALID_KEY);
  });
});

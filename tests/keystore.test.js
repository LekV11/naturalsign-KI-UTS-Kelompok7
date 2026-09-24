/**
 * Unit Test 2: Keystore & Enkripsi Kunci Privat
 * Sesuai Kriteria Section 3.5 & 6 (Anti Plaintext Key, AES-256-GCM + PBKDF2)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair } from '../src/crypto/keygen.js';
import { encryptPrivateKey, decryptPrivateKey } from '../src/keystore/keystore.js';

describe('Modul 1: Keystore & Keamanan Private Key', () => {
  const { privateKey } = generateKeyPair();
  const passphrase = 'SuperSecretPassphrase123!';

  test('Private key terenkripsi tidak boleh memuat teks kunci asli (No Plaintext Leak)', () => {
    const keystore = encryptPrivateKey(privateKey, passphrase, { signerName: 'Budi' });
    const keystoreString = JSON.stringify(keystore);

    // Kunci asli tidak boleh bocor sama sekali di dalam keystore
    assert.equal(keystoreString.includes('BEGIN PRIVATE KEY'), false);
    assert.equal(keystore.crypto.cipher, 'aes-256-gcm');
    assert.equal(keystore.crypto.kdf, 'pbkdf2');
    assert.ok(keystore.crypto.ciphertext.length > 32);
    assert.ok(keystore.crypto.mac.length === 32); // 16 bytes auth tag hex
  });

  test('Dekripsi dengan passphrase yang benar harus menghasilkan private key asli', () => {
    const keystore = encryptPrivateKey(privateKey, passphrase);
    const decryptedKey = decryptPrivateKey(keystore, passphrase);

    assert.equal(decryptedKey, privateKey);
  });

  test('Dekripsi dengan passphrase SALAH harus GAGAL dan melempar error', () => {
    const keystore = encryptPrivateKey(privateKey, passphrase);

    assert.throws(() => {
      decryptPrivateKey(keystore, 'WrongPassword999!');
    }, /Dekripsi gagal/);
  });

  test('Modifikasi ciphertext atau auth tag pada keystore harus tertolak (Tamper Resistant)', () => {
    const keystore = encryptPrivateKey(privateKey, passphrase);
    // Ubah 1 karakter ciphertext
    const tamperedCiphertext = keystore.crypto.ciphertext.substring(0, keystore.crypto.ciphertext.length - 2) + '00';
    keystore.crypto.ciphertext = tamperedCiphertext;

    assert.throws(() => {
      decryptPrivateKey(keystore, passphrase);
    }, /Dekripsi gagal/);
  });
});

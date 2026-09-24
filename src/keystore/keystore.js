/**
 * NaturalSign - Module Keystore: Private Key Encryption & Storage
 * Anggota Penanggung Jawab: Modul 1 (Kriptografi & Keystore)
 * 
 * Sesuai Requirement 3.5 & 6:
 * - Kunci privat TIDAK BOLEH disimpan dalam bentuk plaintext.
 * - Menggunakan CSPRNG (crypto.randomBytes) untuk membangkitkan salt dan IV.
 * - Key Derivation Function (KDF): PBKDF2 (HMAC-SHA256, 100.000 iterasi) atau Scrypt.
 * - Enkripsi Simetris: AES-256-GCM (Authenticated Encryption) dengan Auth Tag (MAC) 128-bit.
 *   Dilarang keras memakai mode ECB!
 */

import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits untuk AES-256
const SALT_LENGTH = 16; // 128 bits CSPRNG
const IV_LENGTH = 12; // 96 bits CSPRNG untuk AES-GCM
const AUTH_TAG_LENGTH = 16; // 128 bits GCM tag

/**
 * Enkripsi private key dengan passphrase pengguna
 * @param {string} privateKeyPem - Private key dalam format PEM
 * @param {string} passphrase - Kata sandi penandatangan
 * @param {object} meta - Metadata tambahan (nama pemilik, created date, dll.)
 * @returns {object} Keystore JSON object terenkripsi
 */
export function encryptPrivateKey(privateKeyPem, passphrase, meta = {}) {
  if (!privateKeyPem || typeof privateKeyPem !== 'string') {
    throw new Error('Private key tidak boleh kosong');
  }
  if (!passphrase || typeof passphrase !== 'string' || passphrase.length < 6) {
    throw new Error('Passphrase minimal harus 6 karakter untuk keamanan');
  }

  // 1. Bangkitkan Salt & IV menggunakan CSPRNG
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // 2. Turunkan kunci simetris 256-bit menggunakan PBKDF2
  const derivedKey = crypto.pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );

  // 3. Enkripsi private key menggunakan AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const ciphertextBuffer = Buffer.concat([
    cipher.update(Buffer.from(privateKeyPem, 'utf8')),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  // 4. Return format Keystore standar (JSON aman)
  return {
    version: 1,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    crypto: {
      cipher: 'aes-256-gcm',
      ciphertext: ciphertextBuffer.toString('hex'),
      cipherparams: {
        iv: iv.toString('hex')
      },
      kdf: 'pbkdf2',
      kdfparams: {
        iterations: PBKDF2_ITERATIONS,
        hash: 'sha256',
        keylen: KEY_LENGTH,
        salt: salt.toString('hex')
      },
      mac: authTag.toString('hex')
    },
    meta: {
      ...meta
    }
  };
}

/**
 * Dekripsi private key dari Keystore JSON dengan passphrase
 * @param {object|string} keystoreData - Keystore JSON object atau JSON string
 * @param {string} passphrase - Kata sandi penandatangan
 * @returns {string} Private key dalam format PEM
 */
export function decryptPrivateKey(keystoreData, passphrase) {
  if (typeof keystoreData === 'string') {
    keystoreData = JSON.parse(keystoreData);
  }

  if (!keystoreData || !keystoreData.crypto) {
    throw new Error('Format Keystore tidak valid');
  }
  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('Passphrase harus diisi');
  }

  const { cipher: cipherAlgo, ciphertext, cipherparams, kdf, kdfparams, mac } = keystoreData.crypto;

  if (cipherAlgo !== 'aes-256-gcm') {
    throw new Error(`Cipher '${cipherAlgo}' tidak didukung`);
  }

  const salt = Buffer.from(kdfparams.salt, 'hex');
  const iv = Buffer.from(cipherparams.iv, 'hex');
  const authTag = Buffer.from(mac, 'hex');
  const ciphertextBuffer = Buffer.from(ciphertext, 'hex');

  // Turunkan kunci simetris menggunakan parameter yang tersimpan
  let derivedKey;
  if (kdf === 'pbkdf2') {
    derivedKey = crypto.pbkdf2Sync(
      passphrase,
      salt,
      kdfparams.iterations,
      kdfparams.keylen,
      kdfparams.hash
    );
  } else {
    throw new Error(`KDF '${kdf}' tidak didukung`);
  }

  // Dekripsi dengan verifikasi integritas Auth Tag
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);
    const decryptedBuffer = Buffer.concat([
      decipher.update(ciphertextBuffer),
      decipher.final()
    ]);
    return decryptedBuffer.toString('utf8');
  } catch (err) {
    throw new Error('Dekripsi gagal: Passphrase salah atau data Keystore telah dimanipulasi!');
  }
}

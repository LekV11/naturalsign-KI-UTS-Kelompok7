/**
 * NaturalSign - Module Kriptografi: Signer
 * Anggota Penanggung Jawab: Modul 1 (Kriptografi & Keystore)
 * 
 * Sesuai Requirement 3.2:
 * 1. Hitung hash SHA-256 dari dokumen PDF.
 * 2. Tanda tangani NILAI HASH tersebut menggunakan private key penandatangan.
 * 3. Kembalikan signature dalam format base64.
 */

import crypto from 'node:crypto';
import { SUPPORTED_ALGORITHMS } from './keygen.js';

/**
 * Menghitung hash SHA-256 dari buffer/dokumen
 * @param {Buffer|Uint8Array} documentBuffer
 * @returns {string} Hexadecimal SHA-256 hash
 */
export function computeSHA256(documentBuffer) {
  if (!Buffer.isBuffer(documentBuffer)) {
    documentBuffer = Buffer.from(documentBuffer);
  }
  return crypto.createHash('sha256').update(documentBuffer).digest('hex');
}

/**
 * Menandatangani NILAI HASH dokumen dengan private key penandatangan
 * @param {string} hashHex - SHA-256 digest dalam bentuk hex
 * @param {string} privateKeyPem - Private key penandatangan (format PEM PKCS#8)
 * @param {string} algorithm - 'ECDSA_P256' | 'RSA_PSS_2048'
 * @returns {string} Signature dalam format base64
 */
export function signHash(hashHex, privateKeyPem, algorithm = SUPPORTED_ALGORITHMS.ECDSA_P256) {
  if (!hashHex || typeof hashHex !== 'string') {
    throw new Error('Nilai hash dokumen tidak valid');
  }
  if (!privateKeyPem || typeof privateKeyPem !== 'string') {
    throw new Error('Private key harus disediakan dalam format PEM');
  }

  const hashBuffer = Buffer.from(hashHex, 'hex');

  if (algorithm === SUPPORTED_ALGORITHMS.ECDSA_P256) {
    // ECDSA dengan SHA-256
    const sign = crypto.createSign('SHA256');
    sign.update(hashBuffer);
    sign.end();
    return sign.sign(privateKeyPem, 'base64');
  } else if (algorithm === SUPPORTED_ALGORITHMS.RSA_PSS_2048) {
    // RSA-PSS dengan SHA-256
    const sign = crypto.createSign('sha256');
    sign.update(hashBuffer);
    sign.end();
    return sign.sign({
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
    }, 'base64');
  } else {
    throw new Error(`Algoritma '${algorithm}' tidak didukung`);
  }
}

/**
 * Helper all-in-one: menghitung hash dokumen lalu menandatanganinya
 * @param {Buffer|Uint8Array} documentBuffer
 * @param {string} privateKeyPem
 * @param {string} algorithm
 * @returns {{ docHash: string, signature: string, algorithm: string }}
 */
export function signDocument(documentBuffer, privateKeyPem, algorithm = SUPPORTED_ALGORITHMS.ECDSA_P256) {
  const docHash = computeSHA256(documentBuffer);
  const signature = signHash(docHash, privateKeyPem, algorithm);
  return {
    docHash,
    signature,
    algorithm
  };
}

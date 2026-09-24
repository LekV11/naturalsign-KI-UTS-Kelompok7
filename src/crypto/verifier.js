/**
 * NaturalSign - Module Kriptografi: Verifier
 * Anggota Penanggung Jawab: Modul 1 (Kriptografi & Keystore)
 * 
 * Sesuai Requirement 3.3 & 9:
 * - Memverifikasi tanda tangan digital terhadap hash dokumen.
 * - Membedakan hasil secara spesifik:
 *    1. VALID: Dokumen utuh & kunci publik penandatangan valid.
 *    2. TAMPERED: Isi dokumen berubah sedikit pun (uji tamper).
 *    3. INVALID_KEY: Public key tidak cocok dengan signature.
 *    4. MALFORMED: Format input salah/korup.
 */

import crypto from 'node:crypto';
import { SUPPORTED_ALGORITHMS } from './keygen.js';
import { computeSHA256 } from './signer.js';

export const VERIFICATION_STATUS = {
  VALID: 'VALID',
  TAMPERED: 'TAMPERED',
  INVALID_KEY: 'INVALID_KEY',
  MALFORMED: 'MALFORMED'
};

/**
 * Memverifikasi tanda tangan terhadap hash tertentu
 * @param {string} hashHex - SHA-256 hash dokumen (hex)
 * @param {string} signatureBase64 - Signature (base64)
 * @param {string} publicKeyPem - Public key (PEM format SPKI)
 * @param {string} algorithm - 'ECDSA_P256' | 'RSA_PSS_2048'
 * @returns {boolean} True jika signature valid dengan public key tsb
 */
export function verifyHash(hashHex, signatureBase64, publicKeyPem, algorithm = SUPPORTED_ALGORITHMS.ECDSA_P256) {
  try {
    const hashBuffer = Buffer.from(hashHex, 'hex');

    if (algorithm === SUPPORTED_ALGORITHMS.ECDSA_P256) {
      const verify = crypto.createVerify('SHA256');
      verify.update(hashBuffer);
      verify.end();
      return verify.verify(publicKeyPem, signatureBase64, 'base64');
    } else if (algorithm === SUPPORTED_ALGORITHMS.RSA_PSS_2048) {
      const verify = crypto.createVerify('sha256');
      verify.update(hashBuffer);
      verify.end();
      return verify.verify({
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
      }, signatureBase64, 'base64');
    } else {
      throw new Error(`Algoritma '${algorithm}' tidak didukung`);
    }
  } catch (err) {
    return false;
  }
}

/**
 * Verifikasi lengkap dokumen:
 * Membandingkan hash dokumen saat ini, hash yang ditandatangani, dan keaslian signature.
 * @param {Buffer|Uint8Array} currentDocBuffer - Isi dokumen yang sedang diperiksa
 * @param {string} expectedDocHash - Hash dokumen saat ditandatangani (dari QR / metadata)
 * @param {string} signatureBase64 - Tanda tangan digital
 * @param {string} publicKeyPem - Kunci publik pengesah
 * @param {string} algorithm - Algoritma penandatanganan
 * @returns {{
 *   isValid: boolean,
 *   status: string,
 *   message: string,
 *   currentDocHash: string,
 *   expectedDocHash: string
 * }}
 */
export function verifyDocument(
  currentDocBuffer,
  expectedDocHash,
  signatureBase64,
  publicKeyPem,
  algorithm = SUPPORTED_ALGORITHMS.ECDSA_P256
) {
  if (!currentDocBuffer || !signatureBase64 || !publicKeyPem) {
    return {
      isValid: false,
      status: VERIFICATION_STATUS.MALFORMED,
      message: 'Parameter verifikasi tidak lengkap (dokumen, signature, atau public key kosong).',
      currentDocHash: null,
      expectedDocHash
    };
  }

  const currentDocHash = computeSHA256(currentDocBuffer);

  // 1. Cek apakah dokumen telah diubah (Tamper Check)
  if (expectedDocHash && currentDocHash.toLowerCase() !== expectedDocHash.toLowerCase()) {
    return {
      isValid: false,
      status: VERIFICATION_STATUS.TAMPERED,
      message: 'DOKUMEN TELAH DIUBAH! Hash dokumen saat ini tidak sesuai dengan hash saat ditandatangani.',
      currentDocHash,
      expectedDocHash
    };
  }

  // 2. Cek apakah tanda tangan valid dengan public key penandatangan
  const isSignatureMatch = verifyHash(currentDocHash, signatureBase64, publicKeyPem, algorithm);

  if (!isSignatureMatch) {
    return {
      isValid: false,
      status: VERIFICATION_STATUS.INVALID_KEY,
      message: 'KUNCI TIDAK COCOK ATAU TANDA TANGAN TIDAK VALID! Kunci publik yang digunakan bukan milik penandatangan dokumen ini.',
      currentDocHash,
      expectedDocHash: expectedDocHash || currentDocHash
    };
  }

  // 3. Semua valid
  return {
    isValid: true,
    status: VERIFICATION_STATUS.VALID,
    message: 'VERIFIKASI BERHASIL! Dokumen asli, utuh (tidak dimodifikasi), dan tanda tangan digital terverifikasi valid.',
    currentDocHash,
    expectedDocHash: expectedDocHash || currentDocHash
  };
}

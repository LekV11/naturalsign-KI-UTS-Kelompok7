/**
 * NaturalSign - Module Kriptografi: Key Generation
 * Anggota Penanggung Jawab: Modul 1 (Kriptografi & Keystore)
 * 
 * Menggunakan CSPRNG bawaan node:crypto untuk membangkitkan pasangan kunci.
 * Pilihan skema:
 *  1. ECDSA kurva P-256 (prime256v1) -> Menghasilkan signature ringkas (~70 byte DER), ideal untuk QR-Code.
 *  2. RSA-PSS 2048-bit (SHA-256) -> Skema klasik dengan padding PSS sesuai kriteria UTS.
 */

import crypto from 'node:crypto';

export const SUPPORTED_ALGORITHMS = {
  ECDSA_P256: 'ECDSA_P256',
  RSA_PSS_2048: 'RSA_PSS_2048'
};

/**
 * Pembangkitan pasangan kunci menggunakan CSPRNG
 * @param {string} algorithm - 'ECDSA_P256' | 'RSA_PSS_2048'
 * @returns {{ publicKey: string, privateKey: string, algorithm: string, createdAt: string }}
 */
export function generateKeyPair(algorithm = SUPPORTED_ALGORITHMS.ECDSA_P256) {
  let keyPair;

  if (algorithm === SUPPORTED_ALGORITHMS.ECDSA_P256) {
    keyPair = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1', // NIST P-256
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
  } else if (algorithm === SUPPORTED_ALGORITHMS.RSA_PSS_2048) {
    keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
  } else {
    throw new Error(`Algoritma '${algorithm}' tidak didukung. Pilihan: ECDSA_P256 atau RSA_PSS_2048`);
  }

  return {
    algorithm,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    createdAt: new Date().toISOString()
  };
}

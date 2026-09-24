/**
 * NaturalSign - Module QR-Code: Generator & Parser
 * Anggota Penanggung Jawab: Modul 2 (PDF & QR-Code Engine)
 * 
 * Sesuai Requirement 3.4:
 * - Isi QR-Code minimal:
 *    1. Nama penandatangan
 *    2. Jabatan
 *    3. Tanggal tanda tangan
 *    4. Nama institusi
 *    5. Signature & DocHash (atau Verification Link/ID)
 * - Alur logika pembuatan payload, validasi, dan pembacaan ditulis sendiri (custom logic),
 *   hanya rendering QR memakai library qrcode.
 */

import QRCode from 'qrcode';

/**
 * Membangun payload metadata digital signature untuk QR-Code
 * @param {object} params
 * @param {string} params.signerName - Nama lengkap penandatangan
 * @param {string} params.role - Jabatan penandatangan
 * @param {string} params.institution - Nama institusi / perguruan tinggi
 * @param {string} [params.date] - Tanggal ISO penandatanganan
 * @param {string} params.docHash - SHA-256 hash dokumen yang ditandatangani
 * @param {string} params.signature - Signature digital base64
 * @param {string} [params.algorithm] - 'ECDSA_P256' | 'RSA_PSS_2048'
 * @param {string} [params.publicKey] - Opsional: Public key (agar verifikasi bisa self-contained)
 * @param {string} [params.verifyUrl] - URL endpoint verifikasi
 * @returns {object} Payload JSON object terstruktur
 */
export function buildQRPayload({
  signerName,
  role,
  institution,
  date = new Date().toISOString(),
  docHash,
  signature,
  algorithm = 'ECDSA_P256',
  publicKey = null,
  verifyUrl = null
}) {
  if (!signerName || !role || !institution) {
    throw new Error('Metadata penandatangan (nama, jabatan, institusi) wajib diisi');
  }
  if (!docHash || !signature) {
    throw new Error('Hash dokumen dan signature wajib disertakan pada QR-Code');
  }

  const payload = {
    app: 'NaturalSign',
    ver: '1.0',
    signer: {
      name: signerName.trim(),
      role: role.trim(),
      inst: institution.trim(),
      date: date
    },
    doc: {
      hash: docHash,
      algo: algorithm
    },
    sig: signature
  };

  if (publicKey) {
    payload.pub = publicKey;
  }
  if (verifyUrl) {
    payload.url = verifyUrl;
  }

  return payload;
}

/**
 * Generate QR-Code sebagai Image Buffer (PNG)
 * @param {object|string} payload - Payload QR
 * @param {object} [options]
 * @returns {Promise<Buffer>}
 */
export async function generateQRBuffer(payload, options = {}) {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const qrOptions = {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 1,
    width: options.width || 250,
    color: {
      dark: '#1e293b',
      light: '#ffffff'
    },
    ...options
  };

  return await QRCode.toBuffer(content, qrOptions);
}

/**
 * Generate QR-Code sebagai Data URL (base64 string untuk preview di Web UI)
 * @param {object|string} payload
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function generateQRDataURL(payload, options = {}) {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return await QRCode.toDataURL(content, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: options.width || 250,
    ...options
  });
}

/**
 * Parsing dan validasi isi QR-Code
 * Sesuai kriteria: Alur pembacaan payload ditulis sendiri
 * @param {string|object} qrRawContent
 * @returns {{
 *   isValidFormat: boolean,
 *   payload: object|null,
 *   error: string|null
 * }}
 */
export function parseQRPayload(qrRawContent) {
  try {
    let parsed;
    if (typeof qrRawContent === 'object' && qrRawContent !== null) {
      parsed = qrRawContent;
    } else if (typeof qrRawContent === 'string') {
      parsed = JSON.parse(qrRawContent);
    } else {
      return { isValidFormat: false, payload: null, error: 'Data QR bukan format yang dikenali' };
    }

    // Validasi skema & struktur wajib
    if (parsed.app !== 'NaturalSign') {
      return { isValidFormat: false, payload: null, error: 'Header aplikasi bukan NaturalSign' };
    }
    if (!parsed.signer || !parsed.signer.name || !parsed.signer.role || !parsed.signer.inst) {
      return { isValidFormat: false, payload: null, error: 'Metadata penandatangan di dalam QR tidak lengkap' };
    }
    if (!parsed.doc || !parsed.doc.hash) {
      return { isValidFormat: false, payload: null, error: 'DocHash tidak ditemukan pada QR-Code' };
    }
    if (!parsed.sig) {
      return { isValidFormat: false, payload: null, error: 'Signature digital tidak ditemukan pada QR-Code' };
    }

    return {
      isValidFormat: true,
      payload: parsed,
      error: null
    };
  } catch (err) {
    return {
      isValidFormat: false,
      payload: null,
      error: `Gagal membaca isi QR-Code: ${err.message}`
    };
  }
}

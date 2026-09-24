/**
 * NaturalSign - Express API Routes
 * Anggota Penanggung Jawab: Modul 3 (Backend API & UI Integration)
 */

import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { generateKeyPair, SUPPORTED_ALGORITHMS } from '../crypto/keygen.js';
import { computeSHA256 } from '../crypto/signer.js';
import { verifyDocument, VERIFICATION_STATUS } from '../crypto/verifier.js';
import { encryptPrivateKey, decryptPrivateKey } from '../keystore/keystore.js';
import { signAndEmbedPDF, extractSignatureFromPDF, extractProtectedContent } from '../pdf/pdfEngine.js';
import { parseQRPayload } from '../qrcode/qrEngine.js';
import { runFullBenchmark } from '../../benchmark/benchmark.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB max
});

export const apiRouter = express.Router();

/**
 * 1. Pembangkitan Kunci (Keygen)
 * POST /api/keygen
 */
apiRouter.post('/keygen', (req, res) => {
  try {
    const { algorithm = SUPPORTED_ALGORITHMS.ECDSA_P256, passphrase, signerName, role, institution } = req.body;
    const keyPair = generateKeyPair(algorithm);

    let keystore = null;
    if (passphrase) {
      keystore = encryptPrivateKey(keyPair.privateKey, passphrase, {
        signerName: signerName || 'Pemilik Kunci',
        role,
        institution,
        algorithm
      });
    }

    res.json({
      success: true,
      data: {
        algorithm: keyPair.algorithm,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        keystore,
        createdAt: keyPair.createdAt
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 2. Enkripsi Kunci Privat ke Keystore
 * POST /api/keystore/encrypt
 */
apiRouter.post('/keystore/encrypt', (req, res) => {
  try {
    const { privateKey, passphrase, meta } = req.body;
    const keystore = encryptPrivateKey(privateKey, passphrase, meta);
    res.json({ success: true, data: keystore });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 3. Dekripsi Keystore dengan Passphrase
 * POST /api/keystore/decrypt
 */
apiRouter.post('/keystore/decrypt', (req, res) => {
  try {
    const { keystore, passphrase } = req.body;
    const privateKey = decryptPrivateKey(keystore, passphrase);
    res.json({ success: true, data: { privateKey } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 4. Tanda Tangani Dokumen PDF (Sign & Embed QR)
 * POST /api/sign
 */
apiRouter.post('/sign', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'File PDF harus diunggah' });
    }

    const {
      signerName,
      role,
      institution,
      algorithm = SUPPORTED_ALGORITHMS.ECDSA_P256
    } = req.body;

    let privateKey = req.body.privateKey;
    let publicKey = req.body.publicKey;

    // Jika user mengunggah keystore + passphrase, dekripsi terlebih dahulu
    if (!privateKey && req.body.keystore && req.body.passphrase) {
      privateKey = decryptPrivateKey(req.body.keystore, req.body.passphrase);
    }

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Private key atau Keystore terenkripsi + passphrase wajib disediakan'
      });
    }

    // Turunkan public key jika belum tersedia
    if (!publicKey) {
      try {
        publicKey = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
      } catch (e) {
        // Abaikan jika gagal
      }
    }

    const signerMeta = {
      signerName: signerName || 'Pejabat Pengesah',
      role: role || 'Dosen Pengampu',
      institution: institution || 'Universitas Siliwangi',
      date: new Date().toISOString()
    };

    const signResult = await signAndEmbedPDF(
      req.file.buffer,
      signerMeta,
      privateKey,
      publicKey || null,
      algorithm
    );

    res.json({
      success: true,
      data: {
        docHash: signResult.docHash,
        signature: signResult.signature,
        qrPayload: signResult.qrPayload,
        qrDataUrl: signResult.qrDataUrl,
        signedPdfBase64: Buffer.from(signResult.signedPdfBytes).toString('base64'),
        fileName: `${req.file.originalname.replace(/\.pdf$/i, '')}_signed.pdf`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. Verifikasi Dokumen & Tanda Tangan
 * POST /api/verify
 */
apiRouter.post('/verify', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'File dokumen harus diunggah' });
    }

    const uploadedBuffer = req.file.buffer;

    // Ekstrak dokumen kanonikal yang dilindungi & deteksi manipulasi container
    const { protectedDocBuffer, isContainerTampered } = extractProtectedContent(uploadedBuffer);
    const currentDocHash = computeSHA256(protectedDocBuffer);

    let publicKey = req.body.publicKey;
    let expectedDocHash = req.body.expectedHash;
    let signature = req.body.signature;
    let algorithm = req.body.algorithm || SUPPORTED_ALGORITHMS.ECDSA_P256;
    let signerMetadata = null;

    // A. Cek jika user menyertakan data hasil scan QR-Code
    if (req.body.qrData) {
      const qrParsed = parseQRPayload(req.body.qrData);
      if (qrParsed.isValidFormat) {
        expectedDocHash = qrParsed.payload.doc.hash;
        signature = qrParsed.payload.sig;
        algorithm = qrParsed.payload.doc.algo || algorithm;
        signerMetadata = qrParsed.payload.signer;
        if (!publicKey && qrParsed.payload.pub) {
          publicKey = qrParsed.payload.pub;
        }
      }
    }

    // B. Ekstrak dari metadata digital signature bawaan NaturalSign
    if (!signature || !expectedDocHash || !publicKey) {
      const extracted = await extractSignatureFromPDF(uploadedBuffer);
      if (extracted) {
        if (!expectedDocHash) expectedDocHash = extracted.doc.hash;
        if (!signature) signature = extracted.sig;
        if (!algorithm) algorithm = extracted.doc.algo || algorithm;
        if (!signerMetadata) signerMetadata = extracted.signer;
        if (!publicKey && extracted.pub) {
          publicKey = extracted.pub;
        }
      }
    }

    if (!signature) {
      return res.json({
        success: true,
        data: {
          isValid: false,
          status: VERIFICATION_STATUS.MALFORMED,
          message: 'Tanda tangan digital tidak ditemukan pada dokumen ataupun input QR.',
          currentDocHash,
          expectedDocHash: null
        }
      });
    }

    if (!publicKey) {
      return res.json({
        success: true,
        data: {
          isValid: false,
          status: VERIFICATION_STATUS.MALFORMED,
          message: 'Kunci publik penandatangan harus disediakan untuk memverifikasi keabsahan.',
          currentDocHash,
          expectedDocHash,
          signerMetadata
        }
      });
    }

    // Jalankan Verifikasi Kriptografis
    const verdict = verifyDocument(
      protectedDocBuffer,
      expectedDocHash,
      signature,
      publicKey,
      algorithm,
      isContainerTampered
    );

    res.json({
      success: true,
      data: {
        ...verdict,
        algorithm,
        signerMetadata
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. Jalankan Otomatisasi Benchmark & Uji Keamanan
 * GET /api/benchmark?iterations=30
 */
apiRouter.get('/benchmark', async (req, res) => {
  try {
    const iterations = Math.min(Math.max(parseInt(req.query.iterations || '30', 10), 5), 100);
    const results = await runFullBenchmark(iterations);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * NaturalSign - Module PDF Engine
 * Anggota Penanggung Jawab: Modul 2 (PDF & QR-Code Engine)
 * 
 * Bertanggung jawab untuk:
 * 1. Membaca file PDF asli dan menghitung SHA-256 hash dokumen mentah.
 * 2. Menyematkan QR-Code dan Badge Tanda Tangan Digital visual ke halaman PDF menggunakan pdf-lib.
 * 3. Menyimpan metadata tanda tangan (signature, docHash, signer) ke dalam dokumen PDF.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { computeSHA256, signHash } from '../crypto/signer.js';
import { buildQRPayload, generateQRBuffer, generateQRDataURL } from '../qrcode/qrEngine.js';

/**
 * Menandatangani dokumen PDF dan menyematkan QR-Code visual serta metadata
 * @param {Buffer|Uint8Array} originalPdfBuffer - Buffer PDF asli
 * @param {object} signerMeta - { signerName, role, institution, date }
 * @param {string} privateKeyPem - Kunci privat penandatangan
 * @param {string} [publicKeyPem] - Kunci publik penandatangan
 * @param {string} [algorithm='ECDSA_P256'] - Algoritma penandatangan
 * @param {object} [badgeOptions] - Opsi letak badge visual
 * @returns {Promise<{
 *   signedPdfBytes: Uint8Array,
 *   docHash: string,
 *   signature: string,
 *   qrPayload: object,
 *   qrDataUrl: string
 * }>}
 */
export async function signAndEmbedPDF(
  originalPdfBuffer,
  signerMeta,
  privateKeyPem,
  publicKeyPem = null,
  algorithm = 'ECDSA_P256',
  badgeOptions = {}
) {
  // 1. Hitung SHA-256 Hash dokumen asli (sebelum di-modify)
  const docHash = computeSHA256(originalPdfBuffer);

  // 2. Tanda tangani NILAI HASH dokumen menggunakan private key
  const signature = signHash(docHash, privateKeyPem, algorithm);

  // 3. Bangun payload metadata untuk QR-Code
  const qrPayload = buildQRPayload({
    signerName: signerMeta.signerName,
    role: signerMeta.role,
    institution: signerMeta.institution,
    date: signerMeta.date || new Date().toISOString(),
    docHash,
    signature,
    algorithm,
    publicKey: publicKeyPem
  });

  // 4. Generate QR-Code image buffer & DataURL
  const qrBuffer = await generateQRBuffer(qrPayload, { width: 180 });
  const qrDataUrl = await generateQRDataURL(qrPayload, { width: 180 });

  // 5. Buka dokumen PDF dengan pdf-lib untuk menyematkan visual badge
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  const pages = pdfDoc.getPages();
  const pageIndex = badgeOptions.pageIndex ?? (pages.length - 1); // default halaman terakhir
  const targetPage = pages[pageIndex] || pages[0];
  const { width: pageWidth, height: pageHeight } = targetPage.getSize();

  // Embed gambar QR ke dalam PDF
  const qrImage = await pdfDoc.embedPng(qrBuffer);

  // Ukuran & Posisi Badge Tanda Tangan Digital
  const badgeWidth = badgeOptions.width || 230;
  const badgeHeight = badgeOptions.height || 85;
  const margin = badgeOptions.margin || 25;
  
  // Posisi default: sudut kanan bawah halaman
  const x = badgeOptions.x ?? (pageWidth - badgeWidth - margin);
  const y = badgeOptions.y ?? margin;

  // Gambar Card Background Glass/Container
  targetPage.drawRectangle({
    x,
    y,
    width: badgeWidth,
    height: badgeHeight,
    color: rgb(0.96, 0.98, 1.0), // Ice white / light azure
    borderColor: rgb(0.12, 0.44, 0.96), // Royal Blue
    borderWidth: 1.2
  });

  // Header Bar kecil
  targetPage.drawRectangle({
    x,
    y: y + badgeHeight - 16,
    width: badgeWidth,
    height: 16,
    color: rgb(0.12, 0.44, 0.96)
  });

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Teks Header
  targetPage.drawText('DITANDATANGANI SECARA DIGITAL', {
    x: x + 10,
    y: y + badgeHeight - 12,
    size: 7,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  // Gambar QR-Code di sisi kiri badge
  const qrDisplaySize = 60;
  targetPage.drawImage(qrImage, {
    x: x + 8,
    y: y + 6,
    width: qrDisplaySize,
    height: qrDisplaySize
  });

  // Teks Metadata di sisi kanan QR-Code
  const textX = x + qrDisplaySize + 14;
  const sanitize = (str) => (str || '').replace(/[^\x20-\x7E]/g, '');

  targetPage.drawText(sanitize(signerMeta.signerName).substring(0, 24), {
    x: textX,
    y: y + badgeHeight - 30,
    size: 8.5,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.2)
  });

  targetPage.drawText(sanitize(signerMeta.role).substring(0, 28), {
    x: textX,
    y: y + badgeHeight - 42,
    size: 7,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45)
  });

  targetPage.drawText(sanitize(signerMeta.institution).substring(0, 28), {
    x: textX,
    y: y + badgeHeight - 53,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45)
  });

  const dateStr = new Date(qrPayload.signer.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  targetPage.drawText(`Tgl: ${dateStr}`, {
    x: textX,
    y: y + badgeHeight - 64,
    size: 6,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5)
  });

  targetPage.drawText(`SHA: ${docHash.substring(0, 14)}...`, {
    x: textX,
    y: y + badgeHeight - 74,
    size: 5.5,
    font: fontRegular,
    color: rgb(0.2, 0.4, 0.8)
  });

  // Simpan payload signature ke dalam metadata PDF (Keywords) agar bisa di-parse otomatis
  pdfDoc.setTitle(`Signed - ${signerMeta.signerName}`);
  pdfDoc.setAuthor(signerMeta.signerName);
  pdfDoc.setSubject('Digital Signature NaturalSign');
  pdfDoc.setKeywords([
    'NaturalSign-Signature',
    `NATURALSIGN_PAYLOAD_START:${Buffer.from(JSON.stringify(qrPayload)).toString('base64')}:NATURALSIGN_PAYLOAD_END`
  ]);

  const signedPdfBytes = await pdfDoc.save();

  return {
    signedPdfBytes,
    docHash,
    signature,
    qrPayload,
    qrDataUrl
  };
}

/**
 * Mengekstrak payload tanda tangan NaturalSign yang tersimpan di metadata PDF
 * @param {Buffer|Uint8Array} pdfBytes
 * @returns {Promise<object|null>}
 */
export async function extractSignatureFromPDF(pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const keywords = pdfDoc.getKeywords();
    if (!keywords) return null;

    const kwStr = Array.isArray(keywords) ? keywords.join(' ') : String(keywords);
    if (kwStr.includes('NATURALSIGN_PAYLOAD_START:')) {
      const matches = kwStr.match(/NATURALSIGN_PAYLOAD_START:(.*?):NATURALSIGN_PAYLOAD_END/);
      if (matches && matches[1]) {
        const jsonStr = Buffer.from(matches[1], 'base64').toString('utf8');
        return JSON.parse(jsonStr);
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

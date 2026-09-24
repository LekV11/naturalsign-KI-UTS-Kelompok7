/**
 * NaturalSign - Sample Document Generator
 * Membuat contoh PDF Surat Keterangan Akademik Universitas Siliwangi untuk demo & pengujian
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

export async function createSampleCertificatePDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait in points
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Border Dekorasi Sertifikat / Surat
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: rgb(0.12, 0.44, 0.96),
    borderWidth: 2
  });

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: rgb(0.7, 0.8, 0.95),
    borderWidth: 0.8
  });

  // Header Institusi
  page.drawText('KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI', {
    x: 70,
    y: height - 70,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });

  page.drawText('UNIVERSITAS SILIWANGI - FAKULTAS TEKNIK', {
    x: 120,
    y: height - 88,
    size: 14,
    font: fontBold,
    color: rgb(0.12, 0.44, 0.96)
  });

  page.drawText('PROGRAM STUDI INFORMATIKA', {
    x: 195,
    y: height - 105,
    size: 11,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35)
  });

  page.drawText('Jl. Siliwangi No. 24, Kahuripan, Kec. Tawang, Kota Tasikmalaya, Jawa Barat 46115', {
    x: 95,
    y: height - 120,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5)
  });

  // Garis Pembatas Kop Surat
  page.drawLine({
    start: { x: 40, y: height - 130 },
    end: { x: width - 40, y: height - 130 },
    thickness: 2,
    color: rgb(0.12, 0.44, 0.96)
  });

  // Judul Dokumen
  page.drawText('SURAT KETERANGAN KEASLIAN DOKUMEN AKADEMIK', {
    x: 100,
    y: height - 170,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });

  page.drawText('Nomor: 042/UN58.FT.INF/KI/2026', {
    x: 195,
    y: height - 188,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.4)
  });

  // Isi Surat
  const isiTeks = [
    'Yang bertanda tangan di bawah ini menerangkan bahwa:',
    '',
    'Nama Mahasiswa        : Tim Pengembang NaturalSign',
    'Program Studi             : Informatika',
    'Fakultas                       : Teknik',
    'Perguruan Tinggi        : Universitas Siliwangi',
    'Mata Kuliah                 : Keamanan Informasi (Tugas UTS)',
    '',
    'Telah menyelesaikan perancangan dan implementasi sistem Digital Signature',
    'NaturalSign yang memenuhi standar otentisitas, integritas data, dan nir-penyangkalan',
    '(non-repudiation) menggunakan kriptografi asimetris dan verifikasi QR-Code.',
    '',
    'Surat keterangan ini diterbitkan secara sah dan dilindungi dengan tanda tangan',
    'digital kriptografis berstandar SHA-256 dan kunci pasangan asimetris.',
    'Pihak yang berkepentingan dapat memverifikasi keabsahan dokumen ini melalui QR-Code tertera.'
  ];

  let currentY = height - 230;
  for (const line of isiTeks) {
    if (line.startsWith('Nama Mahasiswa') || line.startsWith('Program Studi') || line.startsWith('Perguruan Tinggi') || line.startsWith('Mata Kuliah')) {
      page.drawText(line, {
        x: 60,
        y: currentY,
        size: 10,
        font: fontBold,
        color: rgb(0.15, 0.2, 0.3)
      });
    } else {
      page.drawText(line, {
        x: 60,
        y: currentY,
        size: 10,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.3)
      });
    }
    currentY -= 18;
  }

  // Bagian Tanda Tangan Konvensional (Sebelum Digital Signature QR ditempel)
  page.drawText('Tasikmalaya, 24 September 2026', {
    x: 350,
    y: currentY - 30,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3)
  });

  page.drawText('Dekan Fakultas Teknik / Dosen Pengampu,', {
    x: 350,
    y: currentY - 48,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3)
  });

  page.drawText('( Area Tempel Tanda Tangan Digital & QR-Code )', {
    x: 330,
    y: currentY - 100,
    size: 8,
    font: fontOblique,
    color: rgb(0.6, 0.65, 0.7)
  });

  const pdfBytes = await pdfDoc.save();
  const outputDir = path.join(process.cwd(), 'sample-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'surat_keterangan_sample.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`[SUCCESS] Sample PDF berhasil dibuat di: ${outputPath}`);
  return outputPath;
}

if (process.argv[1]?.endsWith('createSamplePdf.js')) {
  createSampleCertificatePDF().catch(console.error);
}

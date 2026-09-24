/**
 * NaturalSign - Automated Benchmark & Security Verification Suite
 * Anggota Penanggung Jawab: Modul 4 (Testing & Benchmark Lead)
 * 
 * Sesuai Kriteria Section 4:
 * 4.1 Ukur waktu sign & verify (ulangi minimal 30 kali, hitung mean & stddev dalam ms)
 * 4.2 Catat ukuran signature (byte) dan ukuran public key (byte)
 * 4.3 Uji tamper (ubah 1 byte dokumen -> HARUS gagal)
 * 4.4 Uji kunci salah (verifikasi pakai public key lain -> HARUS gagal)
 * 4.5 Uji QR-Code dipalsukan (ubah isi QR -> HARUS gagal)
 * Otomatis ekspor ke format tabel CSV untuk lampiran laporan UTS!
 */

import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { generateKeyPair, SUPPORTED_ALGORITHMS } from '../src/crypto/keygen.js';
import { computeSHA256, signHash } from '../src/crypto/signer.js';
import { verifyDocument, VERIFICATION_STATUS } from '../src/crypto/verifier.js';
import { buildQRPayload, parseQRPayload } from '../src/qrcode/qrEngine.js';
import { saveCsvFile } from './exportCsv.js';

function calculateStats(numbers) {
  const n = numbers.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;
  const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
  const stdDev = Math.sqrt(variance);
  return {
    mean: Number(mean.toFixed(3)),
    stdDev: Number(stdDev.toFixed(3)),
    min: Number(Math.min(...numbers).toFixed(3)),
    max: Number(Math.max(...numbers).toFixed(3))
  };
}

export async function runFullBenchmark(iterations = 30) {
  console.log(`\n======================================================`);
  console.log(`  NATURALSIGN - BENCHMARK & SECURITY SUITE`);
  console.log(`  Pengujian Otomatis UTS Keamanan Informasi (N = ${iterations})`);
  console.log(`======================================================\n`);

  // Target Dokumen Uji Dummy
  const testDoc = Buffer.from('SURAT KEPUTUSAN PENGESAHAN DOKUMEN ELEKTRONIK UNIVERSITAS SILIWANGI 2026');
  const docHash = computeSHA256(testDoc);

  const algorithms = [
    SUPPORTED_ALGORITHMS.ECDSA_P256,
    SUPPORTED_ALGORITHMS.RSA_PSS_2048
  ];

  const benchmarkSummary = [];
  const detailedIterations = [];

  for (const algo of algorithms) {
    console.log(`--> Menjalankan Pengujian untuk Algoritma: ${algo}`);
    const keyPair = generateKeyPair(algo);

    const pubKeySizeBytes = Buffer.byteLength(keyPair.publicKey, 'utf8');
    const signTimes = [];
    const verifyTimes = [];
    let sampleSigBytes = 0;

    for (let i = 1; i <= iterations; i++) {
      // 1. Ukur Waktu Sign
      const tSignStart = performance.now();
      const sig = signHash(docHash, keyPair.privateKey, algo);
      const tSignEnd = performance.now();
      const signDuration = tSignEnd - tSignStart;
      signTimes.push(signDuration);

      if (i === 1) {
        sampleSigBytes = Buffer.byteLength(sig, 'utf8');
      }

      // 2. Ukur Waktu Verify
      const tVerifyStart = performance.now();
      const vResult = verifyDocument(testDoc, docHash, sig, keyPair.publicKey, algo);
      const tVerifyEnd = performance.now();
      const verifyDuration = tVerifyEnd - tVerifyStart;
      verifyTimes.push(verifyDuration);

      if (!vResult.isValid) {
        throw new Error(`Verifikasi gagal tak terduga pada iterasi ke-${i}`);
      }

      detailedIterations.push({
        iteration: i,
        algorithm: algo,
        signTimeMs: Number(signDuration.toFixed(4)),
        verifyTimeMs: Number(verifyDuration.toFixed(4)),
        sigSizeBytes: sampleSigBytes,
        pubKeySizeBytes: pubKeySizeBytes
      });
    }

    const signStats = calculateStats(signTimes);
    const verifyStats = calculateStats(verifyTimes);

    benchmarkSummary.push({
      algorithm: algo,
      iterations,
      pubKeySizeBytes,
      signatureSizeBytes: sampleSigBytes,
      avgSignTimeMs: signStats.mean,
      stdDevSignMs: signStats.stdDev,
      avgVerifyTimeMs: verifyStats.mean,
      stdDevVerifyMs: verifyStats.stdDev
    });
  }

  // Tampilkan Tabel Hasil Benchmark Waktu & Ukuran
  console.log('\n--- 4.1 & 4.2 HASIL PENGUKURAN WAKTU & UKURAN KUNCI/SIGNATURE ---');
  console.table(benchmarkSummary);

  // Jalankan Uji Keamanan (Tamper, Kunci Salah, QR Palsu)
  console.log('\n--- 4.3, 4.4, 4.5 PENGUJIAN SKENARIO HARUS GAGAL (SECURITY TESTS) ---');
  const securityTests = [];

  const mainKeys = generateKeyPair(SUPPORTED_ALGORITHMS.ECDSA_P256);
  const otherKeys = generateKeyPair(SUPPORTED_ALGORITHMS.ECDSA_P256);
  const originalDoc = Buffer.from('DOKUMEN ASLI TANDA TANGAN ELEKTRONIK');
  const originalHash = computeSHA256(originalDoc);
  const originalSig = signHash(originalHash, mainKeys.privateKey, SUPPORTED_ALGORITHMS.ECDSA_P256);

  // 4.3 Uji Tamper (Ubah 1 byte pada dokumen)
  const tamperedDoc = Buffer.from(originalDoc);
  tamperedDoc[0] ^= 0x01; // flip 1 bit pada byte pertama
  const tamperResult = verifyDocument(tamperedDoc, originalHash, originalSig, mainKeys.publicKey);
  const tamperPassed = !tamperResult.isValid && tamperResult.status === VERIFICATION_STATUS.TAMPERED;
  securityTests.push({
    testCase: '4.3 Uji Tamper (Modifikasi 1 Byte)',
    expected: 'GAGAL (Status TAMPERED)',
    actualStatus: tamperResult.status,
    isRejectedAsExpected: !tamperResult.isValid,
    verdict: tamperPassed ? 'PASS (Aman)' : 'FAIL (Rentan)'
  });

  // 4.4 Uji Kunci Salah (Verifikasi dengan Public Key pihak lain)
  const wrongKeyResult = verifyDocument(originalDoc, originalHash, originalSig, otherKeys.publicKey);
  const wrongKeyPassed = !wrongKeyResult.isValid && wrongKeyResult.status === VERIFICATION_STATUS.INVALID_KEY;
  securityTests.push({
    testCase: '4.4 Uji Kunci Salah (Imposter Public Key)',
    expected: 'GAGAL (Status INVALID_KEY)',
    actualStatus: wrongKeyResult.status,
    isRejectedAsExpected: !wrongKeyResult.isValid,
    verdict: wrongKeyPassed ? 'PASS (Aman)' : 'FAIL (Rentan)'
  });

  // 4.5 Uji QR-Code Dipalsukan (Ubah signature/metadata di QR)
  const forgedQRPayload = buildQRPayload({
    signerName: 'Hacker Dimanipulasi',
    role: 'Pengesah Palsu',
    institution: 'Institusi Palsu',
    docHash: originalHash,
    signature: Buffer.from('PalsuSignature12345').toString('base64')
  });
  const forgedResult = verifyDocument(originalDoc, forgedQRPayload.doc.hash, forgedQRPayload.sig, mainKeys.publicKey);
  const forgedPassed = !forgedResult.isValid && forgedResult.status === VERIFICATION_STATUS.INVALID_KEY;
  securityTests.push({
    testCase: '4.5 Uji QR-Code Dipalsukan (Forged Signature)',
    expected: 'GAGAL (Status INVALID_KEY)',
    actualStatus: forgedResult.status,
    isRejectedAsExpected: !forgedResult.isValid,
    verdict: forgedPassed ? 'PASS (Aman)' : 'FAIL (Rentan)'
  });

  console.table(securityTests);

  // Simpan hasil ke file CSV
  const rootDir = process.cwd();
  const summaryCsvPath = path.join(rootDir, 'benchmark_summary.csv');
  const detailsCsvPath = path.join(rootDir, 'benchmark_iterations.csv');
  const securityCsvPath = path.join(rootDir, 'security_tests_results.csv');

  saveCsvFile(summaryCsvPath, benchmarkSummary);
  saveCsvFile(detailsCsvPath, detailedIterations);
  saveCsvFile(securityCsvPath, securityTests);

  console.log(`\n[SUCCESS] Seluruh hasil pengujian berhasil diekspor ke:`);
  console.log(`  1. ${summaryCsvPath}`);
  console.log(`  2. ${detailsCsvPath}`);
  console.log(`  3. ${securityCsvPath}`);
  console.log(`Data ini siap dilampirkan langsung ke dalam Laporan UTS!\n`);

  return {
    summary: benchmarkSummary,
    securityTests
  };
}

// Jalankan jika dieksekusi langsung
if (process.argv[1]?.endsWith('benchmark.js')) {
  runFullBenchmark(30).catch(console.error);
}

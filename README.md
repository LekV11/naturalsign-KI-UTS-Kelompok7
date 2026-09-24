# NaturalSign - Sistem Tanda Tangan Dokumen Digital & Verifikasi QR-Code

> **Tugas Ujian Tengah Semester (UTS) - Mata Kuliah Keamanan Informasi**  
> Program Studi Informatika, Fakultas Teknik, Universitas Siliwangi (2026)

Aplikasi tanda tangan elektronik dokumen PDF berbasis web modern dengan visualisasi badge QR-Code kriptografis, penyimpanan kunci privat terenkripsi (PBKDF2 + AES-256-GCM), verifikasi integritas dokumen anti-tamper (1-byte detection), serta suite pengujian dan benchmark otomatis berstandar statistik (mean & standar deviasi N=30) yang dapat diekspor langsung ke format CSV.

---

## 👥 Tim Pengembang & Identitas Kelompok

| No | Nama Lengkap | NPM | Peran / Jobdesc |
|---|---|---|---|
| 1 | [Nama Anggota 1] | [NPM 1] | Modul Kriptografi & Keystore |
| 2 | [Nama Anggota 2] | [NPM 2] | Modul PDF & QR-Code Engine |
| 3 | [Nama Anggota 3] | [NPM 3] | Modul Web Application & UI/UX |
| 4 | [Nama Anggota 4] | [NPM 4] | Modul QA, Benchmark & Laporan UTS |

*(Detail pembagian tugas kerja paralel tersedia di [`JOBDESC.md`](JOBDESC.md))*

---

## 🚀 Fitur Utama & Kepatuhan Spesifikasi (UTS Checklist)

| No | Kriteria Penilaian Wajib | Implementasi di NaturalSign | Status |
|---|---|---|:---:|
| 1 | **Pembangkitan Pasangan Kunci (3.1)** | CSPRNG bawaan `node:crypto` dengan opsi **ECDSA Kurva P-256** (NIST prime256v1) dan **RSA-PSS 2048-bit** (SHA-256). | ✅ LULUS |
| 2 | **Proses Penandatanganan / Sign (3.2)** | Menghitung hash SHA-256 dari dokumen PDF asli, lalu menandatangani nilai hash tersebut dengan Private Key. | ✅ LULUS |
| 3 | **Proses Verifikasi / Verify (3.3)** | Verifikasi signature kriptografis terhadap hash dokumen. Status dibedakan dengan tegas: `VALID`, `TAMPERED`, dan `INVALID_KEY`. | ✅ LULUS |
| 4 | **Penyematan QR-Code (3.4)** | Menyematkan QR-Code dan Badge Tanda Tangan visual pada halaman PDF berisi: Nama Penandatangan, Jabatan, Tanggal, Institusi, DocHash, dan Signature. | ✅ LULUS |
| 5 | **Keamanan Kunci Privat / Keystore (3.5)** | Kunci privat **tidak pernah disimpan plaintext**. Dilindungi enkripsi **AES-256-GCM** dengan derivasi kunci **PBKDF2** (100.000 iterasi) + Salt 16-byte CSPRNG. | ✅ LULUS |
| 6 | **Benchmark & Statistik (4.1 & 4.2)** | Mengukur waktu sign & verify dengan 30x pengulangan, menghitung rata-rata & standar deviasi (ms), mengukur ukuran byte kunci & signature, diekspor ke CSV. | ✅ LULUS |
| 7 | **Pengujian Skenario Harus Gagal (4.3 - 4.5)** | Script otomatis untuk uji tamper 1 byte, uji verifikasi dengan public key pihak lain, dan uji QR-Code dipalsukan. Semua terbukti tertolak. | ✅ LULUS |
| 8 | **Anti Algoritma Usang (6.0)** | Nol penggunaan MD5, SHA-1, DES, RC4, ataupun mode cipher ECB. | ✅ LULUS |
| 9 | **Automated Unit Tests (6.0)** | 16 Automated Unit & Integration Tests (100% Pass) menggunakan test runner resmi Node.js. | ✅ LULUS |

---

## 🛠️ Stack Teknologi

- **Runtime & Bahasa:** Node.js (v20+ / ES Modules)
- **Backend Framework:** Express.js 4.x
- **Kriptografi:** `node:crypto` (CSPRNG, SHA-256, ECDSA P-256, RSA-PSS, AES-256-GCM, PBKDF2)
- **Manipulasi PDF:** `pdf-lib` (membaca hash dokumen, menggambar badge visual, menyematkan QR PNG & metadata)
- **QR-Code Engine:** `qrcode` (rendering PNG/DataURL) + Logika pembuatan payload & parsing mandiri
- **Pengujian:** Node.js Native Test Runner (`node:test`)
- **Frontend / UI:** Vanilla HTML5, Vanilla CSS3 (Dark Mode Luxury Glassmorphism dengan HSL tokens, tanpa ketergantungan library luar), Vanilla ES6 JavaScript

---

## 📂 Struktur Direktori Proyek

```text
naturalsign/
├── .env.example                     # Konfigurasi environment template
├── .gitignore                       # Menjaga kunci rahasia (*.pem, *.key, keystore.json) dari Git
├── package.json                     # Dependency & scripts npm
├── README.md                        # Dokumentasi utama proyek & panduan instalasi
├── JOBDESC.md                       # Panduan kerja paralel untuk 4 anggota kelompok
├── src/
│   ├── crypto/
│   │   ├── keygen.js                # CSPRNG Key generation (ECDSA P-256 & RSA-PSS)
│   │   ├── signer.js                # Hashing SHA-256 dokumen & signing digest
│   │   └── verifier.js              # Verifikasi signature & deteksi tamper
│   ├── keystore/
│   │   └── keystore.js              # Enkripsi & dekripsi private key (AES-256-GCM + PBKDF2)
│   ├── qrcode/
│   │   └── qrEngine.js              # Logika pembentukan payload QR & validasi isi
│   ├── pdf/
│   │   └── pdfEngine.js             # Embedding visual badge QR ke PDF & ekstraksi metadata
│   ├── api/
│   │   ├── routes.js                # Express API endpoints (/keygen, /sign, /verify, /benchmark)
│   │   └── server.js                # Server entry point & static file hosting
│   └── ui/
│       ├── index.html               # Web UI responsif modern
│       ├── style.css                # Desain dark luxury glassmorphism & animasi
│       └── app.js                   # Logika interaktif antarmuka & client API calls
├── benchmark/
│   ├── benchmark.js                 # Runner pengujian N=30, mean, stddev, dan security tests
│   └── exportCsv.js                 # Utilitas ekspor data tabel pengujian ke format CSV
├── tests/
│   ├── crypto.test.js               # Unit test modul kriptografi dasar
│   ├── keystore.test.js             # Unit test keamanan private key & keystore
│   ├── qr.test.js                   # Unit test payload & deteksi QR palsu
│   ├── tamper.test.js               # Unit test deteksi perubahan 1 byte dokumen
│   ├── wrongKey.test.js             # Unit test penolakan public key pihak lain
│   └── integration.test.js          # Integration test end-to-end PDF sign & verify
└── sample-data/
    ├── createSamplePdf.js           # Generator PDF surat keterangan resmi Universitas Siliwangi
    └── surat_keterangan_sample.pdf  # PDF sampel untuk keperluan demo & pengujian
```

---

## ⚡ Panduan Instalasi & Menjalankan (Clean Install)

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi pada komputer manapun:

### 1. Prasyarat Sistem
- **Node.js**: Versi 20.x atau lebih baru (direkomendasikan Node.js LTS).
- **Git** (opsional untuk cloning repository).

### 2. Instalasi Dependency
Buka terminal (Command Prompt / PowerShell / Bash) di direktori proyek:
```bash
npm install
```

### 3. Generate Dokumen Sampel (Opsional)
Untuk membuat dokumen PDF surat keterangan contoh untuk pengujian:
```bash
npm run generate-sample
```
File akan dibuat di: `sample-data/surat_keterangan_sample.pdf`.

### 4. Menjalankan Unit Tests (16 Pengujian Otomatis)
Pastikan seluruh pengujian inti lulus:
```bash
npm test
```

### 5. Menjalankan Benchmark 30 Iterasi & Ekspor CSV
Untuk mengukur kecepatan dan mengekspor tabel hasil pengujian untuk laporan UTS:
```bash
npm run benchmark
```
Output tabel CSV akan dibuat otomatis:
- `benchmark_summary.csv`
- `benchmark_iterations.csv`
- `security_tests_results.csv`

### 6. Menjalankan Server Aplikasi Web
Jalankan dev server:
```bash
npm start
```
Buka browser dan akses antarmuka web di:
👉 **`http://localhost:3000`**

---

## 🎬 Skenario Demonstrasi Sidang UTS (Live Demo Guide)

Saat presentasi di hadapan dosen penguji, lakukan 4 langkah demonstrasi berikut:

1. **Demonstrasi Tanda Tangan Dokumen Asli:**
   - Masuk ke tab **"Tanda Tangani PDF"**.
   - Unggah file PDF contoh (`sample-data/surat_keterangan_sample.pdf`).
   - Masukkan metadata penandatangan (Nama, Jabatan, Institusi).
   - Klik **"Tanda Tangani & Sematkan QR-Code"**.
   - Tunjukkan QR-Code yang muncul dan unduh file PDF bertanda tangan. Buka PDF tersebut dan perlihatkan badge tanda tangan digital di pojok kanan bawah!

2. **Demonstrasi Verifikasi Dokumen Asli (Hasil: SUKSES):**
   - Klik tombol **"Uji Dokumen Ini di Tab Verifikasi"** (atau buka tab Verifikasi dan unggah PDF yang baru diunduh).
   - Klik **"Verifikasi Keaslian Dokumen"**.
   - Sistem akan menampilkan banner hijau: **`VERIFIKASI BERHASIL: DOKUMEN ASLI`**.

3. **Demonstrasi Uji Tamper / Modifikasi Dokumen (Hasil: GAGAL):**
   - Di tab Verifikasi, klik tombol merah **"Simulasi Uji Tamper (Ubah 1 Byte)"**.
   - Sistem secara sengaja membalik 1 bit data pada file dokumen.
   - Hasil verifikasi seketika berubah menjadi banner merah: **`PERINGATAN: DOKUMEN TELAH DIMODIFIKASI!`** dengan status **`TAMPERED`**. Tunjukkan kepada dosen bahwa hash dokumen saat ini sudah tidak sesuai dengan hash tanda tangan.

4. **Demonstrasi Verifikasi Kunci Salah (Hasil: GAGAL):**
   - Ganti isi Public Key di formulir verifikasi dengan public key acak atau pasangan kunci lain.
   - Klik verifikasi, sistem langsung menolak dengan status **`INVALID_KEY`** (Kunci tidak cocok).

---

## 🔒 Kebijakan Keamanan (Security Compliance)

- **CSPRNG Enforced:** Semua pembangkitan IV, Salt, dan Key Pair menggunakan fungsi kriptografis aman dari OS (`crypto.randomBytes` / `crypto.generateKeyPairSync`). Tidak ada penggunaan `Math.random()`.
- **Zero Plaintext Key Storage:** Private key yang disimpan dalam Keystore dienkripsi menggunakan AES-256-GCM. Jika file dibuka di text editor, tidak ada teks PEM kunci yang terlihat.
- **Git Protection:** File `.gitignore` dikonfigurasi untuk mencegah ketidaksengajaan commit file `.env`, file `*.pem`, `*.key`, maupun `keystore.json`.

---

## 📄 Lisensi & Hak Cipta
Dibuat untuk keperluan akademik Tugas Ujian Tengah Semester (UTS) Mata Kuliah Keamanan Informasi, Program Studi Informatika, Universitas Siliwangi.
Lisensi: MIT.

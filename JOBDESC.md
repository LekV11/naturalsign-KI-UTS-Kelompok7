# PANDUAN KERJA PARALEL & JOBDESC TIM NATURALSIGN
**Tugas UTS Mata Kuliah Keamanan Informasi - Program Studi Informatika, Universitas Siliwangi**

Dokumen ini dirancang agar setiap anggota tim dapat mengerjakan tugasnya secara **paralel, mandiri, dan terkoordinasi**, tanpa saling tunggu dan meminimalkan resiko konflik kode (merge conflict).

---

## 👥 Ringkasan Pembagian Tugas (4 Anggota)

| Anggota | Peran / Jobdesc | Modul Kode yang Dikelola | Fokus Ujian / Sidang |
|---|---|---|---|
| **Anggota 1** | **Kriptografi & Keystore Lead** | `src/crypto/`, `src/keystore/`, `tests/crypto.test.js`, `tests/keystore.test.js` | Matematika ECDSA P-256 vs RSA-PSS, CSPRNG, Enkripsi AES-256-GCM + PBKDF2 |
| **Anggota 2** | **PDF & QR-Code Engine Lead** | `src/pdf/`, `src/qrcode/`, `sample-data/`, `tests/qr.test.js` | Parsing payload QR-Code, layout visual badge di PDF, manipulasi binary `pdf-lib` |
| **Anggota 3** | **Fullstack & UI/UX Lead** | `src/api/`, `src/ui/` (HTML, CSS, JS) | REST API endpoints, arsitektur Web responsif, glassmorphism, demo interaktif |
| **Anggota 4** | **QA, Benchmark & Laporan Lead** | `benchmark/`, `tests/tamper.test.js`, `tests/wrongKey.test.js`, Laporan UTS | Metodologi benchmark N=30, rata-rata & standar deviasi, matriks uji kegagalan |

---

## 📌 Detail Jobdesc & Tanggung Jawab Masing-Masing Anggota

### 🔹 ANGGOTA 1: Kriptografi & Keystore Lead
* **Tanggung Jawab Kode:**
  1. `src/crypto/keygen.js`: Menjaga pembangkitan kunci menggunakan CSPRNG (`node:crypto`) untuk ECDSA P-256 dan RSA-PSS 2048-bit.
  2. `src/crypto/signer.js`: Memastikan proses hashing SHA-256 dari dokumen PDF dan penandatanganan nilai hash berjalan presisi.
  3. `src/crypto/verifier.js`: Mengelola logika verifikasi tanda tangan terhadap hash dan public key.
  4. `src/keystore/keystore.js`: Menjamin keamanan private key (enkripsi dengan passphrase pengguna via PBKDF2 100.000 iterasi + AES-256-GCM, DILARANG plaintext / ECB).
* **Target Output:**
  - Lulus `npm test` untuk `crypto.test.js` dan `keystore.test.js`.
  - Format keystore JSON standar yang aman disimpan ke disk.
* **Persiapan Sidang / Presentasi:**
  - Mampu menjelaskan kenapa ECDSA P-256 menghasilkan signature lebih kecil (~96 byte) dibanding RSA-PSS (~344 byte) dan kenapa ini sangat cocok untuk QR-Code.
  - Menjelaskan fungsi Salt 16-byte, IV 12-byte, dan Auth Tag 16-byte pada AES-GCM.

---

### 🔹 ANGGOTA 2: PDF & QR-Code Engine Lead
* **Tanggung Jawab Kode:**
  1. `src/qrcode/qrEngine.js`: Merancang payload JSON terstruktur (Nama, Jabatan, Institusi, Timestamp, DocHash, Signature).
  2. `src/pdf/pdfEngine.js`: Membaca PDF mentah, menghitung hash dokumen awal, dan menggambar "Digital Signature Badge" visual serta menyematkan QR image di halaman PDF menggunakan `pdf-lib`.
  3. Menyimpan payload signature ke dalam metadata dokumen PDF (`Keywords`) agar verifikasi otomatis bisa dilakukan tanpa scan manual.
  4. `sample-data/createSamplePdf.js`: Menyiapkan template PDF surat keterangan / sertifikat resmi.
* **Target Output:**
  - Hasil PDF yang ditandatangani memiliki badge visual yang rapi dan elegan di pojok kanan bawah.
  - Lulus `npm test` untuk `qr.test.js` dan integrasi PDF.
* **Persiapan Sidang / Presentasi:**
  - Menjelaskan struktur payload QR-Code dan bagaimana verifikator mengekstrak data dari QR untuk mencocokkan hash asli dokumen.
  - Menunjukkan kode embedding gambar PNG ke dalam struktur PDF byte stream.

---

### 🔹 ANGGOTA 3: Fullstack & UI/UX Lead
* **Tanggung Jawab Kode:**
  1. `src/api/server.js` & `src/api/routes.js`: Membangun backend Express, route upload file (`multer`), error handling, dan endpoint API:
     - `POST /api/keygen`
     - `POST /api/sign`
     - `POST /api/verify`
     - `GET /api/benchmark`
  2. `src/ui/`: Mengembangkan antarmuka web modern bergaya dark luxury glassmorphism (HTML5, CSS3 kustom, JS interaktif).
  3. Fitur interaktif: Drag-and-drop file PDF, live preview badge QR-Code, download PDF signed, tombol "Simulasi Uji Tamper (Ubah 1 Byte)".
* **Target Output:**
  - Aplikasi web dapat diakses mulus di `http://localhost:3000`.
  - Transisi status verifikasi jelas: **HIJAU (Asli & Valid)**, **MERAH (Dokumen Diubah/Tampered)**, **ORANYE (Kunci Salah)**.
* **Persiapan Sidang / Presentasi:**
  - Menjadi operator utama saat live demo di hadapan dosen:
    1. Sign dokumen sampel.
    2. Unduh PDF hasil tanda tangan.
    3. Verifikasi dokumen sukses.
    4. Klik tombol "Simulasi Uji Tamper" dan perlihatkan sistem langsung mendeteksi modifikasi 1 byte!

---

### 🔹 ANGGOTA 4: QA, Benchmark & Laporan Lead
* **Tanggung Jawab Kode & Dokumentasi:**
  1. `benchmark/benchmark.js`: Menjalankan otomatisasi pengujian Bagian 4 Project Brief:
     - Pengulangan 30 kali untuk sign dan verify.
     - Perhitungan mean (rata-rata) dan standard deviation dalam milidetik (ms).
     - Pengukuran byte size kunci publik dan tanda tangan.
     - Ekspor otomatis ke file CSV (`benchmark_summary.csv`, `benchmark_iterations.csv`, `security_tests_results.csv`).
  2. `tests/tamper.test.js` & `tests/wrongKey.test.js`: Memastikan semua skenario kegagalan wajib tertolak dengan benar.
  3. Penyusunan Makalah / Laporan UTS:
     - Memindahkan tabel CSV hasil benchmark ke dalam Bab Hasil dan Pembahasan.
     - Menyusun dokumentasi screenshot aplikasi.
* **Target Output:**
  - File CSV hasil benchmark yang valid dan dapat dipertanggungjawabkan secara statistik.
  - Laporan UTS lengkap sesuai format akademik Informatika Universitas Siliwangi.
* **Persiapan Sidang / Presentasi:**
  - Menjelaskan interpretasi tabel benchmark waktu komputasi dan standar deviasi antara ECDSA vs RSA.
  - Menjelaskan hasil pengujian skenario kegagalan (Tamper 1 byte, imposter key, forged QR).

---

## 🌿 Strategi Branching Git (Agar Tidak Konflik)

1. **Branch Utama:** `main` (hanya untuk kode yang sudah stabil dan lulus `npm test`).
2. **Branch Fitur Masing-Masing Anggota:**
   - Anggota 1: `git checkout -b feature/crypto-keystore`
   - Anggota 2: `git checkout -b feature/pdf-qrcode`
   - Anggota 3: `git checkout -b feature/web-ui-api`
   - Anggota 4: `git checkout -b feature/qa-benchmark`
3. **Aturan Commit:**
   - **JANGAN PERNAH** meng-commit file `.env`, file `.pem`, atau private key ke Git (sudah dilindungi oleh `.gitignore`).
   - Sebelum melakukan Pull Request / Merge ke `main`, wajib jalankan `npm test` di lokal dan pastikan 100% test lulus.

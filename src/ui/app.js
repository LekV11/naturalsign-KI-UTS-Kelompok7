/**
 * NaturalSign - Client Application Logic
 * Anggota Penanggung Jawab: Modul 3 (Backend API & UI Integration)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let currentGeneratedKeys = null;
  let lastSignedPdfBlob = null;
  let lastSignedPdfFileName = 'signed_document.pdf';
  let lastPublicKeyPem = '';

  // Tab Navigation Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Setup Dropzone Helpers
  function setupDropzone(dropzoneId, inputId, labelId) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        input.files = e.dataTransfer.files;
        label.textContent = `File dipilih: ${e.dataTransfer.files[0].name}`;
      }
    });

    input.addEventListener('change', () => {
      if (input.files && input.files[0]) {
        label.textContent = `File dipilih: ${input.files[0].name}`;
      }
    });
  }

  setupDropzone('sign-dropzone', 'pdf-file-input', 'sign-dropzone-label');
  setupDropzone('verify-dropzone', 'verify-pdf-input', 'verify-dropzone-label');

  // Copy buttons
  function setupCopyButton(btnId, targetAreaId) {
    const btn = document.getElementById(btnId);
    const target = document.getElementById(targetAreaId);
    if (!btn || !target) return;

    btn.addEventListener('click', async () => {
      if (!target.value) return;
      try {
        await navigator.clipboard.writeText(target.value);
        const originalText = btn.textContent;
        btn.textContent = 'Tersalin!';
        setTimeout(() => { btn.textContent = originalText; }, 1800);
      } catch (err) {
        target.select();
        document.execCommand('copy');
      }
    });
  }

  setupCopyButton('btn-copy-pubkey', 'display-pubkey');
  setupCopyButton('btn-copy-privkey', 'display-privkey');
  setupCopyButton('btn-copy-keystore', 'display-keystore');

  // --- TAB 3: KEYGEN & KEYSTORE ---
  const keygenForm = document.getElementById('keygen-form');
  async function triggerKeygen() {
    const algorithm = document.getElementById('keygen-algo').value;
    const passphrase = document.getElementById('keystore-passphrase').value;
    const signerName = document.getElementById('keygen-owner-name').value;
    const role = document.getElementById('keygen-owner-role').value;

    try {
      const res = await fetch('/api/keygen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm, passphrase, signerName, role })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      currentGeneratedKeys = data.data;
      lastPublicKeyPem = data.data.publicKey;

      document.getElementById('display-pubkey').value = data.data.publicKey;
      document.getElementById('display-privkey').value = data.data.privateKey;
      document.getElementById('display-keystore').value = JSON.stringify(data.data.keystore, null, 2);

      // Autofill ke form sign
      document.getElementById('sign-private-key').value = data.data.privateKey;
      document.getElementById('verify-pubkey').value = data.data.publicKey;
    } catch (err) {
      console.error('Keygen error:', err);
    }
  }

  keygenForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerKeygen();
  });

  document.getElementById('btn-use-generated-key')?.addEventListener('click', () => {
    if (currentGeneratedKeys) {
      document.getElementById('sign-private-key').value = currentGeneratedKeys.privateKey;
    } else {
      triggerKeygen();
    }
  });

  document.getElementById('btn-fill-verify-pubkey')?.addEventListener('click', () => {
    if (lastPublicKeyPem) {
      document.getElementById('verify-pubkey').value = lastPublicKeyPem;
    } else if (currentGeneratedKeys) {
      document.getElementById('verify-pubkey').value = currentGeneratedKeys.publicKey;
    }
  });

  document.getElementById('btn-download-keystore')?.addEventListener('click', () => {
    const keystoreContent = document.getElementById('display-keystore').value;
    if (!keystoreContent) return;
    const blob = new Blob([keystoreContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'naturalsign_keystore.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- TAB 1: SIGN FORM ---
  const signForm = document.getElementById('sign-form');
  signForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('pdf-file-input');
    if (!fileInput.files || !fileInput.files[0]) {
      alert('Pilih file PDF terlebih dahulu!');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-sign');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Memproses Kriptografi & QR...</span>`;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('signerName', document.getElementById('signer-name').value);
    formData.append('role', document.getElementById('signer-role').value);
    formData.append('institution', document.getElementById('signer-institution').value);
    formData.append('algorithm', document.getElementById('sign-algo').value);
    formData.append('privateKey', document.getElementById('sign-private-key').value);
    if (lastPublicKeyPem) {
      formData.append('publicKey', lastPublicKeyPem);
    }

    try {
      const res = await fetch('/api/sign', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const { docHash, signature, qrPayload, qrDataUrl, signedPdfBase64, fileName } = result.data;

      // Konversi Base64 ke Blob
      const byteCharacters = atob(signedPdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      lastSignedPdfBlob = new Blob([byteArray], { type: 'application/pdf' });
      lastSignedPdfFileName = fileName;

      // Tampilkan Hasil
      document.getElementById('sign-result-placeholder').style.display = 'none';
      document.getElementById('sign-result-content').classList.remove('hidden');
      document.getElementById('qr-preview-img').src = qrDataUrl;
      document.getElementById('result-doc-hash').textContent = docHash;
      document.getElementById('result-signature').textContent = signature.substring(0, 48) + '...';
      document.getElementById('result-timestamp').textContent = new Date(qrPayload.signer.date).toLocaleString('id-ID');

      const badge = document.getElementById('sign-status-badge');
      badge.textContent = 'Ditandatangani';
      badge.className = 'badge badge-success';
    } catch (err) {
      alert(`Gagal menandatangani: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Tanda Tangani & Sematkan QR-Code</span>
      `;
    }
  });

  document.getElementById('btn-download-signed-pdf')?.addEventListener('click', () => {
    if (!lastSignedPdfBlob) return;
    const url = URL.createObjectURL(lastSignedPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lastSignedPdfFileName;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-test-in-verify')?.addEventListener('click', () => {
    if (!lastSignedPdfBlob) return;
    // Buka tab verify
    document.getElementById('tab-verify-btn').click();
    
    // Pasang file signed ke input tab verify
    const verifyInput = document.getElementById('verify-pdf-input');
    const file = new File([lastSignedPdfBlob], lastSignedPdfFileName, { type: 'application/pdf' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    verifyInput.files = dataTransfer.files;
    document.getElementById('verify-dropzone-label').textContent = `File siap diverifikasi: ${lastSignedPdfFileName}`;

    if (lastPublicKeyPem) {
      document.getElementById('verify-pubkey').value = lastPublicKeyPem;
    }
  });

  // --- TAB 2: VERIFY FORM ---
  const verifyForm = document.getElementById('verify-form');
  
  async function performVerification(fileToVerify) {
    const verifyBtn = document.getElementById('btn-run-verify');
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = `<span>Memeriksa Integritas & Kriptografi...</span>`;

    const formData = new FormData();
    formData.append('file', fileToVerify);
    const pubKey = document.getElementById('verify-pubkey').value;
    if (pubKey) formData.append('publicKey', pubKey);
    const qrData = document.getElementById('verify-qr-payload').value;
    if (qrData) formData.append('qrData', qrData);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      const data = result.data;
      const verdictBox = document.getElementById('verify-verdict-box');
      const verdictTitle = document.getElementById('verdict-title');
      const verdictDesc = document.getElementById('verdict-desc');
      const badge = document.getElementById('verify-status-badge');
      const detailsBox = document.getElementById('verify-details');

      detailsBox.style.display = 'flex';
      document.getElementById('audit-current-hash').textContent = data.currentDocHash || '-';
      document.getElementById('audit-expected-hash').textContent = data.expectedDocHash || '-';

      if (data.signerMetadata) {
        document.getElementById('audit-signer-name').textContent = data.signerMetadata.name || '-';
        document.getElementById('audit-signer-role').textContent = `${data.signerMetadata.role || '-'} (${data.signerMetadata.inst || '-'})`;
      }

      if (data.isValid) {
        // SUKSES
        verdictBox.className = 'verdict-banner verdict-valid';
        verdictTitle.textContent = 'VERIFIKASI BERHASIL: DOKUMEN ASLI';
        verdictDesc.textContent = data.message;
        badge.className = 'badge badge-success';
        badge.textContent = 'ASLI & VALID';
        document.getElementById('audit-tamper-check').textContent = 'LULUS (Tidak ada modifikasi)';
        document.getElementById('audit-tamper-check').style.color = '#34d399';
        document.getElementById('audit-key-check').textContent = 'COCOK & TERVERIFIKASI';
        document.getElementById('audit-key-check').style.color = '#34d399';
      } else if (data.status === 'TAMPERED') {
        // DOKUMEN DIUBAH
        verdictBox.className = 'verdict-banner verdict-tampered';
        verdictTitle.textContent = 'PERINGATAN: DOKUMEN TELAH DIMODIFIKASI!';
        verdictDesc.textContent = data.message;
        badge.className = 'badge badge-danger';
        badge.textContent = 'TAMPERED (RUSAK)';
        document.getElementById('audit-tamper-check').textContent = 'GAGAL (Isi Berubah!)';
        document.getElementById('audit-tamper-check').style.color = '#f87171';
        document.getElementById('audit-key-check').textContent = 'TIDAK TERVALIDASI';
        document.getElementById('audit-key-check').style.color = '#f87171';
      } else if (data.status === 'INVALID_KEY') {
        // KUNCI SALAH
        verdictBox.className = 'verdict-banner verdict-invalid-key';
        verdictTitle.textContent = 'PERINGATAN: KUNCI PUBLIK TIDAK SESUAI!';
        verdictDesc.textContent = data.message;
        badge.className = 'badge badge-warning';
        badge.textContent = 'KUNCI SALAH';
        document.getElementById('audit-tamper-check').textContent = 'Hanya Hash Tidak Sesuai Kunci';
        document.getElementById('audit-tamper-check').style.color = '#fbbf24';
        document.getElementById('audit-key-check').textContent = 'GAGAL (Bukan Kunci Penandatangan)';
        document.getElementById('audit-key-check').style.color = '#fbbf24';
      } else {
        // MALFORMED / FORMAT INVALID
        verdictBox.className = 'verdict-banner verdict-tampered';
        verdictTitle.textContent = 'FORMAT TIDAK VALID';
        verdictDesc.textContent = data.message;
        badge.className = 'badge badge-danger';
        badge.textContent = 'ERROR';
      }
    } catch (err) {
      alert(`Gagal verifikasi: ${err.message}`);
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Verifikasi Keaslian Dokumen</span>
      `;
    }
  }

  verifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('verify-pdf-input');
    if (!fileInput.files || !fileInput.files[0]) {
      alert('Pilih file dokumen PDF terlebih dahulu!');
      return;
    }
    performVerification(fileInput.files[0]);
  });

  // Tombol Simulasi Uji Tamper (Ubah 1 Byte secara live)
  document.getElementById('btn-simulate-tamper')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('verify-pdf-input');
    if (!fileInput.files || !fileInput.files[0]) {
      alert('Pilih file PDF yang sudah ditandatangani terlebih dahulu untuk uji tamper!');
      return;
    }

    const originalFile = fileInput.files[0];
    const arrayBuffer = await originalFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Lakukan modifikasi 1 byte (flip 1 bit)
    const tamperedArray = new Uint8Array(uint8Array);
    tamperedArray[tamperedArray.length - 20] ^= 0x01; // flip 1 bit

    const tamperedBlob = new Blob([tamperedArray], { type: 'application/pdf' });
    const tamperedFile = new File([tamperedBlob], `TAMPERED_${originalFile.name}`, { type: 'application/pdf' });

    alert('SIMULASI TAMPER DIAKTIFKAN: 1 byte pada dokumen telah diubah secara sengaja. Menjalankan verifikasi...');
    performVerification(tamperedFile);
  });

  // --- TAB 4: BENCHMARK EXECUTION ---
  const benchmarkBtn = document.getElementById('btn-run-full-benchmark');
  benchmarkBtn?.addEventListener('click', async () => {
    benchmarkBtn.disabled = true;
    benchmarkBtn.innerHTML = `<span>Menjalankan 30x Iterasi Kriptografi...</span>`;

    try {
      const res = await fetch('/api/benchmark?iterations=30');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const summary = data.data.summary;
      const security = data.data.securityTests;

      // Update Tabel Waktu & Ukuran
      const tbodyTime = document.getElementById('tbody-benchmark-time');
      tbodyTime.innerHTML = summary.map(row => `
        <tr>
          <td><strong>${row.algorithm}</strong></td>
          <td>${row.iterations}</td>
          <td>${row.pubKeySizeBytes} Byte</td>
          <td>${row.signatureSizeBytes} Byte</td>
          <td>${row.avgSignTimeMs} ms</td>
          <td>${row.stdDevSignMs} ms</td>
          <td>${row.avgVerifyTimeMs} ms</td>
          <td>${row.stdDevVerifyMs} ms</td>
        </tr>
      `).join('');

      // Update Tabel Uji Keamanan
      const tbodySec = document.getElementById('tbody-security-tests');
      tbodySec.innerHTML = security.map(row => `
        <tr>
          <td>${row.testCase}</td>
          <td>${row.expected}</td>
          <td><code>${row.actualStatus}</code></td>
          <td><span class="badge ${row.isRejectedAsExpected ? 'badge-success' : 'badge-danger'}">${row.isRejectedAsExpected}</span></td>
          <td><span class="badge ${row.verdict.includes('PASS') ? 'badge-success' : 'badge-danger'}">${row.verdict}</span></td>
        </tr>
      `).join('');

      alert('Benchmark N=30 dan Uji Keamanan Selesai! File CSV telah diperbarui di server.');
    } catch (err) {
      alert(`Gagal menjalankan benchmark: ${err.message}`);
    } finally {
      benchmarkBtn.disabled = false;
      benchmarkBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Jalankan Pengujian (N = 30)</span>
      `;
    }
  });

  document.getElementById('btn-download-benchmark-csv')?.addEventListener('click', () => {
    // Buat data CSV ringkasan dari DOM tabel untuk langsung diunduh pengguna
    const table = document.getElementById('table-benchmark-time');
    let csv = [];
    for (let row of table.rows) {
      let cols = [];
      for (let cell of row.cells) {
        cols.push(`"${cell.innerText.replace(/"/g, '""')}"`);
      }
      csv.push(cols.join(','));
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'naturalsign_benchmark_summary.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Inisialisasi awal: bangkitkan sepasang kunci awal agar siap pakai
  triggerKeygen();
});

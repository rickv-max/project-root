document.getElementById('checkVoters').addEventListener('click', async () => {
  const fileInput = document.getElementById('kkFile');
  const resultDiv = document.getElementById('result');
  const file = fileInput.files[0];

  if (!file) {
    resultDiv.innerHTML = '<p style="color: orange;">⚠️ Mohon unggah gambar terlebih dahulu.</p>';
    return;
  }

  resultDiv.innerHTML = '<p>⏳ Menganalisis gambar, mohon tunggu...</p>';

  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64Image = reader.result;

    try {
      const res = await fetch('/.netlify/functions/generate-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image: base64Image }),
      });

      // data sekarang adalah objek JSON yang sudah di-parse
      const data = await res.json();
      
      // Jika ada properti error di dalam JSON, tampilkan itu
      if (data.error) {
        resultDiv.innerHTML = `<p style="color: red;">❌ ${data.error}</p>`;
        return;
      }
      
      // Panggil fungsi untuk menampilkan hasil
      displayResults(data);

    } catch (err) {
      console.error('Error di sisi client:', err);
      resultDiv.innerHTML = '<p style="color: red;">❌ Terjadi kesalahan saat menghubungi server. Periksa log konsol.</p>';
    }
  };

  reader.readAsDataURL(file);
});

// Fungsi baru untuk memformat dan menampilkan data JSON
function displayResults(data) {
  const resultDiv = document.getElementById('result');
  let html = '';

  // Tampilkan daftar pemilih yang sah
  if (data.pemilih_sah && data.pemilih_sah.length > 0) {
    html += '<h3>✅ Pemilih yang Memenuhi Syarat</h3>';
    html += '<ul>';
    data.pemilih_sah.forEach(pemilih => {
      html += `<li><strong>${pemilih.nama}</strong> (${pemilih.alasan})</li>`;
    });
    html += '</ul>';
  } else {
    html += '<h3>✅ Tidak ditemukan pemilih yang memenuhi syarat.</h3>';
  }

  // Tampilkan daftar yang tidak memenuhi syarat (opsional, bagus untuk verifikasi)
  if (data.tidak_memenuhi_syarat && data.tidak_memenuhi_syarat.length > 0) {
    html += '<h3 style="margin-top: 1.5rem;">🚫 Tidak Memenuhi Syarat</h3>';
    html += '<ul>';
    data.tidak_memenuhi_syarat.forEach(orang => {
      html += `<li><strong>${orang.nama}</strong> (${orang.alasan})</li>`;
    });
    html += '</ul>';
  }

  // Ganti konten div dengan HTML yang sudah kita buat
  resultDiv.innerHTML = html;
}

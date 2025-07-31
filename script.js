document.getElementById('checkVoters').addEventListener('click', async () => {
  const fileInput = document.getElementById('kkFile');
  const resultDiv = document.getElementById('result');
  const file = fileInput.files[0];
  
  // Ambil nilai tahun dari input baru
  const targetYear = document.getElementById('targetYear').value;

  if (!file) {
    resultDiv.innerHTML = '<p style="color: orange;">⚠️ Mohon unggah gambar terlebih dahulu.</p>';
    return;
  }

  // Validasi sederhana untuk tahun
  if (!targetYear || targetYear < 2000) {
    resultDiv.innerHTML = '<p style="color: red;">⚠️ Mohon masukkan tahun yang valid.</p>';
    return;
  }

  resultDiv.innerHTML = `<p>⏳ Menganalisis data untuk tahun <strong>${targetYear}</strong>, mohon tunggu...</p>`;

  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64Image = reader.result;

    try {
      const res = await fetch('/.netlify/functions/generate-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Kirim base64Image DAN targetYear
        body: JSON.stringify({ base64Image, targetYear }),
      });

      const data = await res.json();
      
      if (data.error) {
        resultDiv.innerHTML = `<p style="color: red;">❌ ${data.error}</p>`;
        return;
      }
      
      displayResults(data, targetYear);

    } catch (err) {
      console.error('Error di sisi client:', err);
      resultDiv.innerHTML = '<p style="color: red;">❌ Terjadi kesalahan saat menghubungi server. Periksa log konsol.</p>';
    }
  };

  reader.readAsDataURL(file);
});

// Fungsi displayResults sedikit diubah untuk menampilkan tahun target
function displayResults(data, year) {
  const resultDiv = document.getElementById('result');
  let html = '';

  html += `<h3>Hasil Analisis untuk Tahun ${year}</h3>`;

  if (data.pemilih_sah && data.pemilih_sah.length > 0) {
    html += '<h4>✅ Pemilih yang Memenuhi Syarat</h4>';
    html += '<ul>';
    data.pemilih_sah.forEach(pemilih => {
      html += `<li><strong>${pemilih.nama}</strong><br><small>(${pemilih.alasan})</small></li>`;
    });
    html += '</ul>';
  } else {
    html += '<h4>✅ Tidak ditemukan pemilih yang memenuhi syarat.</h4>';
  }

  if (data.tidak_memenuhi_syarat && data.tidak_memenuhi_syarat.length > 0) {
    html += '<h4 style="margin-top: 1.5rem;">🚫 Tidak Memenuhi Syarat</h4>';
    html += '<ul>';
    data.tidak_memenuhi_syarat.forEach(orang => {
      html += `<li><strong>${orang.nama}</strong><br><small>(${orang.alasan})</small></li>`;
    });
    html += '</ul>';
  }

  resultDiv.innerHTML = html;
}

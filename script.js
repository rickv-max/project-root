document.getElementById('checkVoters').addEventListener('click', async () => {
  const fileInput = document.getElementById('kkFile');
  const resultDiv = document.getElementById('result');
  const targetYear = document.getElementById('targetYear').value;
  const file = fileInput.files[0];

  if (!file) {
    resultDiv.innerHTML = '<p style="color: orange;">⚠️ Mohon unggah gambar terlebih dahulu.</p>';
    return;
  }
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
        body: JSON.stringify({ base64Image, targetYear }),
      });

      const data = await res.json();
      
      if (data.error) {
        resultDiv.innerHTML = `<p style="color: red;">❌ ${data.error}</p>`;
        return;
      }
      
      // Kirim data mentah ke fungsi pemroses logika
      processAndDisplayResults(data, targetYear);

    } catch (err) {
      console.error('Error di sisi client:', err);
      resultDiv.innerHTML = '<p style="color: red;">❌ Terjadi kesalahan saat menghubungi server. Periksa log konsol.</p>';
    }
  };

  reader.readAsDataURL(file);
});


// ================== FUNGSI BARU DENGAN LOGIKA 100% AKURAT ==================
function processAndDisplayResults(data, year) {
  const resultDiv = document.getElementById('result');
  
  const pemilih_sah = [];
  const tidak_memenuhi_syarat = [];

  // Periksa apakah data.anggota_keluarga ada dan merupakan array
  if (!data.anggota_keluarga || !Array.isArray(data.anggota_keluarga)) {
    resultDiv.innerHTML = '<p style="color: red;">❌ Format data dari server tidak sesuai. Tidak ditemukan daftar anggota keluarga.</p>';
    return;
  }

  // Loop melalui data mentah dan terapkan logika di sini
  data.anggota_keluarga.forEach(orang => {
    const usia = orang.usia_pada_tahun_target;
    const status = orang.status_perkawinan.toUpperCase(); // Ubah ke huruf besar untuk konsistensi

    // INI ADALAH LOGIKA PENENTU YANG PASTI BENAR
    if (usia >= 17 || status === "KAWIN") {
      pemilih_sah.push({
        nama: orang.nama,
        alasan: usia >= 17 ? `Akan berusia ${usia} tahun` : `Status Kawin`
      });
    } else {
      tidak_memenuhi_syarat.push({
        nama: orang.nama,
        alasan: `Baru akan berusia ${usia} tahun`
      });
    }
  });

  // Bagian untuk menampilkan hasil (render HTML)
  let html = `<h3>Hasil Analisis untuk Tahun ${year}</h3>`;

  if (pemilih_sah.length > 0) {
    html += '<h4>✅ Pemilih yang Memenuhi Syarat</h4>';
    html += '<ul>';
    pemilih_sah.forEach(p => {
      html += `<li><strong>${p.nama}</strong><br><small>(${p.alasan})</small></li>`;
    });
    html += '</ul>';
  } else {
    html += '<h4>✅ Tidak ditemukan pemilih yang memenuhi syarat.</h4>';
  }

  if (tidak_memenuhi_syarat.length > 0) {
    html += '<h4 style="margin-top: 1.5rem;">🚫 Tidak Memenuhi Syarat</h4>';
    html += '<ul>';
    tidak_memenuhi_syarat.forEach(tms => {
      html += `<li><strong>${tms.nama}</strong><br><small>(${tms.alasan})</small></li>`;
    });
    html += '</ul>';
  }

  resultDiv.innerHTML = html;
}

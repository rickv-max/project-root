document.getElementById(‘checkVoters’).addEventListener(‘click’, async () => {
const fileInput = document.getElementById(‘kkFile’);
const resultDiv = document.getElementById(‘result’);
const targetYear = parseInt(document.getElementById(‘targetYear’).value);
const file = fileInput.files[0];

if (!file) {
resultDiv.innerHTML = ‘<p style="color: orange;">⚠️ Mohon unggah gambar terlebih dahulu.</p>’;
return;
}
if (!targetYear || targetYear < 2000 || targetYear > 2100) {
resultDiv.innerHTML = ‘<p style="color: red;">⚠️ Mohon masukkan tahun yang valid (2000-2100).</p>’;
return;
}

resultDiv.innerHTML = `<p>⏳ Menganalisis data untuk tahun <strong>${targetYear}</strong>, mohon tunggu...</p>`;

const reader = new FileReader();
reader.onloadend = async () => {
const base64Image = reader.result;
try {
const res = await fetch(’/.netlify/functions/generate-voter’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({ base64Image, targetYear }),
});

```
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
```

};

reader.readAsDataURL(file);
});

// ================== FUNGSI PEMROSESAN LOGIKA 100% AKURAT ==================
function processAndDisplayResults(data, year) {
const resultDiv = document.getElementById(‘result’);

const pemilih_sah = [];
const tidak_memenuhi_syarat = [];

// Validasi data
if (!data || !data.anggota_keluarga || !Array.isArray(data.anggota_keluarga)) {
resultDiv.innerHTML = ‘<p style="color: red;">❌ Format data dari server tidak sesuai. Tidak ditemukan daftar anggota keluarga.</p>’;
return;
}

if (data.anggota_keluarga.length === 0) {
resultDiv.innerHTML = ‘<p style="color: orange;">⚠️ Tidak ditemukan data anggota keluarga dalam gambar KK.</p>’;
return;
}

// Loop melalui data mentah dan terapkan logika pemilih
data.anggota_keluarga.forEach(orang => {
// Validasi data anggota keluarga
if (!orang.nama || orang.usia_pada_tahun_target === undefined || !orang.status_perkawinan) {
tidak_memenuhi_syarat.push({
nama: orang.nama || ‘Nama tidak terbaca’,
alasan: ‘Data tidak lengkap’
});
return;
}

```
const usia = parseInt(orang.usia_pada_tahun_target);
const status = orang.status_perkawinan.toString().toUpperCase().trim();

// Validasi usia
if (isNaN(usia) || usia < 0 || usia > 150) {
  tidak_memenuhi_syarat.push({
    nama: orang.nama,
    alasan: 'Usia tidak valid'
  });
  return;
}

// LOGIKA PENENTU PEMILIH YANG MEMENUHI SYARAT
// Syarat: Usia >= 17 tahun ATAU status kawin
if (usia >= 17 || status === "KAWIN" || status === "MARRIED") {
  let alasan = '';
  if (usia >= 17 && (status === "KAWIN" || status === "MARRIED")) {
    alasan = `Berusia ${usia} tahun dan sudah menikah`;
  } else if (usia >= 17) {
    alasan = `Berusia ${usia} tahun`;
  } else if (status === "KAWIN" || status === "MARRIED") {
    alasan = `Sudah menikah (usia ${usia} tahun)`;
  }
  
  pemilih_sah.push({
    nama: orang.nama,
    usia: usia,
    status: status,
    alasan: alasan
  });
} else {
  tidak_memenuhi_syarat.push({
    nama: orang.nama,
    usia: usia,
    status: status,
    alasan: `Belum cukup umur (${usia} tahun) dan belum menikah`
  });
}
```

});

// Render hasil ke HTML
displayResults(pemilih_sah, tidak_memenuhi_syarat, year);
}

function displayResults(pemilih_sah, tidak_memenuhi_syarat, year) {
const resultDiv = document.getElementById(‘result’);

let html = `<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;"> <h3 style="color: #2c3e50; margin-bottom: 20px;">📊 Hasil Analisis Pemilih Tahun ${year}</h3>`;

// Summary
const totalAnggota = pemilih_sah.length + tidak_memenuhi_syarat.length;
html += `<div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #3498db;"> <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📈 Ringkasan</h4> <p style="margin: 5px 0;"><strong>Total Anggota Keluarga:</strong> ${totalAnggota} orang</p> <p style="margin: 5px 0; color: #27ae60;"><strong>Memenuhi Syarat:</strong> ${pemilih_sah.length} orang</p> <p style="margin: 5px 0; color: #e74c3c;"><strong>Tidak Memenuhi Syarat:</strong> ${tidak_memenuhi_syarat.length} orang</p> </div>`;

// Pemilih yang memenuhi syarat
if (pemilih_sah.length > 0) {
html += `<div style="background: #d5f4e6; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #27ae60;"> <h4 style="color: #27ae60; margin: 0 0 15px 0;">✅ Pemilih yang Memenuhi Syarat</h4> <ul style="margin: 0; padding-left: 20px;">`;

```
pemilih_sah.forEach(p => {
  html += `
    <li style="margin-bottom: 10px;">
      <strong style="color: #2c3e50;">${p.nama}</strong><br>
      <small style="color: #27ae60; font-weight: 500;">${p.alasan}</small>
    </li>
  `;
});

html += '</ul></div>';
```

}

// Yang tidak memenuhi syarat
if (tidak_memenuhi_syarat.length > 0) {
html += `<div style="background: #fdf2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #e74c3c;"> <h4 style="color: #e74c3c; margin: 0 0 15px 0;">🚫 Tidak Memenuhi Syarat</h4> <ul style="margin: 0; padding-left: 20px;">`;

```
tidak_memenuhi_syarat.forEach(tms => {
  html += `
    <li style="margin-bottom: 10px;">
      <strong style="color: #2c3e50;">${tms.nama}</strong><br>
      <small style="color: #e74c3c; font-weight: 500;">${tms.alasan}</small>
    </li>
  `;
});

html += '</ul></div>';
```

}

html += ‘</div>’;
resultDiv.innerHTML = html;
}

document.getElementById('checkVoters').addEventListener('click', async () => {
  const fileInput = document.getElementById('kkFile');
  const resultDiv = document.getElementById('result');
  const file = fileInput.files[0];

  if (!file) {
    resultDiv.textContent = '⚠️ Mohon unggah gambar terlebih dahulu.';
    return;
  }

  // Menampilkan status loading
  resultDiv.textContent = '⏳ Memproses gambar, mohon tunggu...';

  const reader = new FileReader();
  reader.onloadend = async () => {
    // Gambar yang sudah di-encode ke base64
    const base64Image = reader.result;

    try {
      // Memanggil Netlify Function
      const res = await fetch('/.netlify/functions/generate-voter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ base64Image: base64Image }),
      });

      // Mendapatkan respons JSON dari function
      const data = await res.json();

      // **INI BAGIAN YANG DIPERBAIKI**
      // Gunakan `data.result` yang dikirim oleh backend, bukan `data.output` atau `data.error`
      if (res.ok) {
        resultDiv.textContent = data.result || 'Tidak ada konten yang diterima dari server.';
      } else {
        // Menampilkan pesan error dari server jika status response bukan 2xx
        resultDiv.textContent = `❌ Error: ${data.result || 'Terjadi kesalahan tidak diketahui.'}`;
      }

    } catch (err) {
      // Menangani error jaringan atau error saat parsing JSON
      console.error('Error di sisi client:', err);
      resultDiv.textContent = '❌ Terjadi kesalahan saat menghubungi server. Periksa koneksi internet Anda.';
    }
  };

  // Membaca file gambar sebagai Data URL (base64)
  reader.readAsDataURL(file);
});

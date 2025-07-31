document.getElementById('checkVoters').addEventListener('click', async () => {
  const fileInput = document.getElementById('kkFile');
  const resultDiv = document.getElementById('result');
  const file = fileInput.files[0];

  if (!file) {
    resultDiv.textContent = 'Mohon unggah gambar terlebih dahulu.';
    return;
  }

  const reader = new FileReader();
  reader.onloadend = async () => {
    resultDiv.textContent = 'Memproses...';
    const base64Image = reader.result;

    try {
      const res = await fetch('/.netlify/functions/generate-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image }),
      });

      const data = await res.json();
      resultDiv.textContent = data.output || data.error || 'Tidak ada respons dari Gemini.';
    } catch (err) {
      resultDiv.textContent = '❌ Terjadi kesalahan saat memproses gambar.';
    }
  };

  reader.readAsDataURL(file);
});

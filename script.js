document.getElementById('pendaftaranForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  
  // Simulasi hasil grok (di production ambil dari API Vision/Gemini)
  const hasilGrok = "✅ Nama sesuai, usia valid, eligible memilih.";
  formData.append('grok_result', hasilGrok);

  const status = document.getElementById('status');
  status.style.display = 'block';
  status.textContent = 'Mengirim data...';

  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbyXOHj6-Lq01FlzHIBpnb_2fdR_ivvUbRiOP3857MPIZQ-hGAY3sgrqNMn526Dai9xy/exec', {
      method: 'POST',
      body: formData
    });

    const result = await response.text();
    status.textContent = '✅ Berhasil dikirim!';
    form.reset();
  } catch (error) {
    console.error('Error:', error);
    status.textContent = '❌ Gagal mengirim data.';
  }
});

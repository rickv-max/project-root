document.getElementById("pendaftaranForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("status");
  status.innerText = "Mengirim data...";
  
  const form = e.target;
  const formData = new FormData(form);

  // Ambil file KK
  const file = document.getElementById("kartu_keluarga").files[0];

  // Upload ke Grok (simulasi, ganti nanti dengan API kamu)
  const grokResponse = await fetch("https://api.grok.openai.com/vision", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_GROK_API_KEY"
    },
    body: file
  });

  const grokResult = await grokResponse.json();

  // Ekstrak hasil Grok: daftar yang memenuhi syarat
  const eligible = grokResult.data.filter(item => {
    const birthYear = parseInt(item.tanggal_lahir.split("-")[0]);
    return (2029 - birthYear) >= 17;
  });

  const eligibleNames = eligible.map(e => e.nama).join(", ");
  formData.append("grok_result", eligibleNames);

  // Kirim ke Google Apps Script
  await fetch("https://script.google.com/macros/s/AKfycbyXOHj6-Lq01FlzHIBpnb_2fdR_ivvUbRiOP3857MPIZQ-hGAY3sgrqNMn526Dai9xy/exec", {
    method: "POST",
    body: formData
  });

  status.innerText = "Berhasil terkirim!";
  form.reset();
});

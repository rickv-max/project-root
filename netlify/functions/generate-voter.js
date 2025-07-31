export default async (req, res) => {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ result: 'Metode tidak diizinkan.' });
  }

  console.log("Fungsi 'generate-voter' dipanggil.");

  try {
    const { base64Image } = JSON.parse(req.body);

    if (!base64Image) {
      console.error("Tidak ada gambar yang diterima dalam body request.");
      return res.status(400).json({ result: 'Tidak ada data gambar yang dikirim.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY tidak ditemukan di environment variables.");
        return res.status(500).json({ result: 'Konfigurasi server tidak lengkap (API Key tidak ada).' });
    }

    const prompt = `
      Anda adalah seorang ahli pembaca data KTP dan Kartu Keluarga (KK) dari Indonesia.
      Tugas Anda adalah membaca gambar Kartu Keluarga yang diberikan.
      Dari gambar tersebut, identifikasi dan sebutkan HANYA nama-nama anggota keluarga yang memenuhi syarat sebagai pemilih dalam Pemilu.
      Syarat pemilih adalah: berusia 17 tahun atau lebih, ATAU memiliki status "KAWIN" pada kolom status perkawinan, meskipun usianya di bawah 17 tahun.
      Sajikan hasilnya dalam format daftar bernomor.
      Jika gambar tidak jelas atau tidak bisa dibaca sama sekali, jawab dengan: "Gambar tidak terbaca dengan jelas. Mohon unggah gambar yang lebih baik."
    `;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg", // Asumsi gambar adalah JPEG
                data: base64Image.split(',')[1] // Menghapus prefix 'data:image/jpeg;base64,'
              }
            }
          ]
        }
      ]
    };

    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
    
    const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    
    const result = await response.json();
    console.log("Respons dari Gemini API:", JSON.stringify(result));

    // Cek jika respons dari Gemini mengandung error
    if (result.error) {
        console.error("Error dari Gemini API:", result.error.message);
        return res.status(500).json({ result: `Error dari API: ${result.error.message}` });
    }
    
    // Cek jika ada kandidat jawaban
    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
      const textResult = result.candidates[0].content.parts[0].text;
      res.status(200).json({ result: textResult });
    } else {
      console.warn("Gemini tidak mengembalikan output yang valid.");
      res.status(500).json({ result: '⚠️ Gemini tidak mengembalikan output. Kemungkinan gambar tidak sesuai atau ada masalah dengan API.' });
    }

  } catch (error) {
    console.error("Terjadi error di dalam server function:", error);
    res.status(500).json({ result: '❌ Terjadi kesalahan internal pada server: ' + error.message });
  }
};

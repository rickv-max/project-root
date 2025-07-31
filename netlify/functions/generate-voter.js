export default async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ result: 'Tidak ada gambar dikirim.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `
      Kamu adalah sistem yang membaca gambar Kartu Keluarga.
      Tugasmu: sebutkan nama-nama dalam gambar tersebut yang memenuhi syarat untuk memilih (usia 17 tahun ke atas atau sudah menikah).
      Jika tidak bisa dibaca, jawab: "Gambar tidak terbaca jelas".
    `;

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image.split(',')[1] // remove data URI prefix
              }
            }
          ]
        }
      ]
    };

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const result = await response.json();

    if (result.candidates && result.candidates.length > 0) {
      res.status(200).json({ result: result.candidates[0].content.parts[0].text });
    } else {
      res.status(500).json({ result: '⚠️ Gemini tidak mengembalikan output. Periksa gambar dan API key.' });
    }
  } catch (error) {
    res.status(500).json({ result: '❌ Terjadi error di server: ' + error.message });
  }
};

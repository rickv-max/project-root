const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const { base64Image } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Berikut ini adalah gambar Kartu Keluarga. Tolong analisis dan beri tahu siapa saja yang memenuhi syarat memilih (usia minimal 17 tahun atau sudah menikah)."
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image.replace(/^data:image\/jpeg;base64,/, "")
                }
              }
            ]
          }
        ]
      })
    });

    const result = await response.json();

    if (!result.candidates || result.candidates.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '⚠️ Tidak ada output dari Gemini. Coba cek gambar dan API key.' })
      };
    }

    const output = result.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      body: JSON.stringify({ output })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `❌ Terjadi error di server: ${err.message}` })
    };
  }
};

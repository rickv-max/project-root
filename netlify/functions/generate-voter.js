import fetch from 'node-fetch';

const API_KEY = process.env.GEMINI_API_KEY;

export async function handler(event, context) {
  try {
    const { base64Image } = JSON.parse(event.body);

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Beritahu siapa saja yang bisa memilih dari data Kartu Keluarga ini. Orang yang bisa memilih adalah yang berusia minimal 17 tahun atau sudah menikah. Tampilkan nama dan statusnya saja:" },
              { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] } }
            ]
          }
        ]
      })
    });

    const result = await response.json();

    if (result.candidates && result.candidates[0]) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          output: result.candidates[0].content.parts[0].text
        })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          output: '⚠️ Tidak ada hasil dari Gemini. Coba periksa gambar.'
        })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '❌ Gagal memproses gambar.' })
    };
  }
}

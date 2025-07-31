export async function handler(event) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { base64Image } = JSON.parse(event.body);
    const cleanedBase64 = base64Image.replace(/^data:image\/(png|jpeg);base64,/, "");

    const prompt = `Gambar ini adalah Kartu Keluarga. Ekstrak semua data anggota keluarga: Nama, NIK, Jenis Kelamin, Tanggal Lahir, dan Status Perkawinan.

Identifikasi siapa saja yang memenuhi syarat memilih:
- Berusia 17 tahun ke atas per hari ini
- ATAU sudah menikah

Kembalikan hasil dalam format JSON seperti ini:
{
  "jumlah_anggota": <angka>,
  "jumlah_pemilih": <angka>,
  "data_pemilih": [
    {
      "nama": "...",
      "nik": "...",
      "tanggal_lahir": "YYYY-MM-DD",
      "status_perkawinan": "Kawin/Belum Kawin",
      "alasan_layak_memilih": "..."
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: cleanedBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await response.json();

    // DEBUG: log isi mentah
    console.log(JSON.stringify(result, null, 2));

    const output =
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ Gemini tidak mengembalikan output. Periksa gambar dan API key.";

    return {
      statusCode: 200,
      body: JSON.stringify({ result: output }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Terjadi kesalahan di server",
        detail: error.message,
      }),
    };
  }
}

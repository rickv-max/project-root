export async function handler(event) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const { base64Image } = JSON.parse(event.body);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `Gambar ini adalah Kartu Keluarga. Silakan baca dan ekstrak semua data anggota keluarga: Nama, NIK, Jenis Kelamin, Tempat/Tanggal Lahir, dan Status Perkawinan.\n\nIdentifikasi siapa saja yang memenuhi syarat memilih:\n- Berusia 17 tahun ke atas per hari ini\n- ATAU sudah menikah\n\nKembalikan data dalam JSON seperti berikut:\n{\n "jumlah_anggota": <jumlah>,\n "jumlah_pemilih": <jumlah>,\n "data_pemilih": [\n   {\n     "nama": "Nama",\n     "nik": "NIK",\n     "tanggal_lahir": "YYYY-MM-DD",\n     "status_perkawinan": "Kawin/Belum Kawin",\n     "alasan_layak_memilih": "..." \n   }\n ]\n}`,
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image.replace(/^data:image\/(png|jpeg);base64,/, ""),
            },
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    const output = result.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respons dari Gemini.";

    return {
      statusCode: 200,
      body: JSON.stringify({ result: output }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Gagal memanggil Gemini API", detail: error.message }),
    };
  }
}

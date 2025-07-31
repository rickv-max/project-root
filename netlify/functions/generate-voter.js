// netlify/functions/generate-voter.js

export async function handler(event) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const { base64Image } = JSON.parse(event.body);

  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Saya mengunggah gambar Kartu Keluarga berikut. Silakan ekstrak semua data anggota keluarga, termasuk: Nama, NIK, Jenis Kelamin, Tanggal Lahir, dan Status Perkawinan.\n\nIdentifikasi siapa saja yang layak memilih berdasarkan:\n- Usia 17 tahun ke atas pada hari ini\n- ATAU sudah menikah\n\nKembalikan hasil dalam format JSON seperti ini:\n{\n  "jumlah_anggota": <angka>,\n  "jumlah_pemilih": <angka>,\n  "data_pemilih": [\n    {\n      "nama": "Nama",\n      "nik": "NIK",\n      "tanggal_lahir": "YYYY-MM-DD",\n      "status_perkawinan": "Kawin/Belum Kawin",\n      "alasan_layak_memilih": "..." \n    }\n  ]\n}`,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image.replace(/^data:image\/\w+;base64,/, "")}`,
          },
        },
      ],
    },
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GEMINI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-pro-vision",
      messages,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();

  return {
    statusCode: 200,
    body: JSON.stringify({ result: data.choices?.[0]?.message?.content || "No result" }),
  };
}

// Handler untuk Netlify Functions API v2
export default async (req) => {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ result: 'Metode tidak diizinkan.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log("Fungsi 'generate-voter' dipanggil.");

  try {
    // 1. FIX: Langsung parse body request sebagai JSON, tanpa JSON.parse() manual
    const { base64Image } = await req.json();

    if (!base64Image) {
      console.error("Tidak ada gambar yang diterima dalam body request.");
      return new Response(JSON.stringify({ result: 'Tidak ada data gambar yang dikirim.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY tidak ditemukan di environment variables.");
      return new Response(JSON.stringify({ result: 'Konfigurasi server tidak lengkap (API Key tidak ada).' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
                mime_type: "image/jpeg",
                data: base64Image.split(',')[1]
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
    });
    
    const result = await response.json();
    console.log("Respons dari Gemini API:", JSON.stringify(result));

    if (result.error) {
      console.error("Error dari Gemini API:", result.error.message);
      return new Response(JSON.stringify({ result: `Error dari API: ${result.error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
      const textResult = result.candidates[0].content.parts[0].text;
      // 2. FIX: Kembalikan respons yang benar
      return new Response(JSON.stringify({ result: textResult }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.warn("Gemini tidak mengembalikan output yang valid.");
      return new Response(JSON.stringify({ result: '⚠️ Gemini tidak mengembalikan output. Kemungkinan gambar tidak sesuai atau ada masalah dengan API.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error("Terjadi error di dalam server function:", error);
    // 2. FIX: Kembalikan respons yang benar di blok catch
    return new Response(JSON.stringify({ result: '❌ Terjadi kesalahan internal pada server: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Handler untuk Netlify Functions API v2
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ result: 'Metode tidak diizinkan.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log("Fungsi 'generate-voter' dipanggil.");

  try {
    const { base64Image } = await req.json();

    if (!base64Image) {
      return new Response(JSON.stringify({ result: 'Tidak ada data gambar yang dikirim.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ result: 'Konfigurasi server tidak lengkap (API Key tidak ada).' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ================== PROMPT YANG DIPERBAIKI ==================
    // Prompt ini lebih detail, memberikan instruksi format, dan contoh.
    const prompt = `
      Anda adalah seorang analis data kependudukan Indonesia yang sangat akurat dan teliti.
      Tugas Anda adalah menganalisis gambar Kartu Keluarga (KK) yang diberikan dan mengidentifikasi anggota keluarga yang memiliki hak pilih.

      Syarat hak pilih adalah:
      1. Usia sudah mencapai 17 tahun atau lebih.
      2. Atau, status perkawinan adalah "KAWIN", tidak peduli berapa usianya.

      Instruksi Output:
      - Analisis setiap anggota keluarga pada gambar.
      - Untuk setiap anggota yang MEMENUHI SYARAT, buatlah daftar bernomor.
      - Setiap item dalam daftar harus mencakup NAMA LENGKAP dan KETERANGAN (alasan mengapa dia memenuhi syarat).
      - Format keterangan harus jelas, contoh: "(Usia 25 tahun)" atau "(Status Kawin)".
      - Jangan menyertakan anggota keluarga yang tidak memenuhi syarat.
      - Jika gambar sama sekali tidak bisa dibaca atau sangat buram, jawab HANYA dengan kalimat: "Gambar tidak terbaca dengan jelas. Mohon unggah gambar yang lebih baik."
      - Jangan menambahkan informasi atau komentar lain di luar daftar tersebut.

      Contoh Output yang Diinginkan:
      Berikut adalah daftar anggota keluarga yang memiliki hak pilih:
      1. BUDI SANTOSO (Usia 45 tahun)
      2. SITI AMINAH (Usia 42 tahun)
      3. RAHMAT HIDAYAT (Status Kawin)
    `;
    // ==========================================================

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

    if (result.error) {
      return new Response(JSON.stringify({ result: `Error dari API: ${result.error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
      const textResult = result.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ result: textResult }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ result: '⚠️ Gemini tidak mengembalikan output. Coba lagi dengan gambar yang lebih jelas.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error("Terjadi error di dalam server function:", error);
    return new Response(JSON.stringify({ result: '❌ Terjadi kesalahan internal pada server: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

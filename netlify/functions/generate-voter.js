export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metode tidak diizinkan.' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { base64Image, targetYear } = await req.json();
    const TAHUN_TARGET = targetYear || new Date().getFullYear();

    if (!base64Image) {
      return new Response(JSON.stringify({ error: 'Tidak ada data gambar yang dikirim.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Konfigurasi server tidak lengkap.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // ================== PROMPT BARU: HANYA EKSTRAKSI DATA MENTAH ==================
    let prompt = `
      Anda adalah mesin OCR (Optical Character Recognition) yang sangat akurat.
      Tugas Anda HANYA SATU: Baca gambar Kartu Keluarga (KK) dan ekstrak data setiap anggota keluarga ke dalam sebuah array JSON.

      PERATURAN EKSTRAKSI:
      1.  Untuk setiap orang di KK, ekstrak: Nama Lengkap, Tanggal Lahir, dan Status Perkawinan.
      2.  Hitung usia setiap orang pada tahun ${TAHUN_TARGET}. Rumus: ${TAHUN_TARGET} - Tahun Lahir.
      3.  Letakkan semua orang ke dalam SATU array JSON bernama "anggota_keluarga".
      4.  JANGAN melakukan klasifikasi atau pemilahan. Hanya ekstrak data.

      FORMAT JSON OUTPUT WAJIB (HANYA JSON, TANPA TEKS LAIN):
      {
        "anggota_keluarga": [
          {
            "nama": "NAMA LENGKAP ORANG 1",
            "usia_pada_tahun_target": 53,
            "status_perkawinan": "KAWIN"
          },
          {
            "nama": "NAMA LENGKAP ORANG 2",
            "usia_pada_tahun_target": 15,
            "status_perkawinan": "BELUM KAWIN"
          }
        ]
      }

      Jika gambar tidak terbaca, kembalikan JSON: { "error": "Gambar tidak terbaca, kualitas terlalu rendah." }
    `;
    // ======================================================================

    const body = {
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] } }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const model = 'gemini-1.5-flash-latest';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    
    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
      const textResult = result.candidates[0].content.parts[0].text;
      console.log("RESPONS DATA MENTAH DARI GEMINI:", textResult);
      return new Response(textResult, { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      console.error("RESPONS ERROR DARI GEMINI:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: 'Gemini tidak mengembalikan output atau respons error.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error("ERROR DI BLOK CATCH:", error);
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal pada server: ' + error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

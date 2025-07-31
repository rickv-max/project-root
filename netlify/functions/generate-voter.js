export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metode tidak diizinkan.' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Terima `targetYear` dari frontend
    const { base64Image, targetYear } = await req.json();
    const TAHUN_TARGET = targetYear || new Date().getFullYear(); // Fallback ke tahun ini

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

    // ================== PROMPT PALING CANGGIH (CHAIN OF THOUGHT) ==================
    let prompt = `
      Anda adalah analis data kependudukan yang sangat teliti dan anti-kesalahan.
      Tugas Anda adalah menganalisis gambar Kartu Keluarga (KK) dan mengisi struktur JSON. Ikuti langkah-langkah ini secara berurutan dan jangan melompat.
      Tahun target untuk perhitungan adalah: ${TAHUN_TARGET}.

      ATURAN KELAYAKAN MUTLAK:
      Seseorang LAYAK memilih jika: (Usia di TAHUN_TARGET >= 17) ATAU (Status Perkawinan adalah "KAWIN").

      PROSES ANALISIS UNTUK SETIAP ORANG:
      1.  **Ekstraksi Data**: Baca NAMA, TANGGAL LAHIR, dan STATUS PERKAWINAN dari gambar.
      2.  **Perhitungan Usia**: Hitung usia orang tersebut pada TAHUN_TARGET. Rumus: ${TAHUN_TARGET} - Tahun Lahir.
      3.  **Analisis & Keputusan**: Bandingkan hasil dengan ATURAN KELAYAKAN MUTLAK.
      4.  **Pengisian JSON**: Masukkan orang tersebut ke grup "pemilih_sah" atau "tidak_memenuhi_syarat" LENGKAP dengan alasannya.

      FORMAT JSON OUTPUT WAJIB (JANGAN TAMBAHKAN TEKS LAIN):
      {
        "pemilih_sah": [
          {
            "nama": "NAMA LENGKAP",
            "alasan": "Pada tahun ${TAHUN_TARGET} akan berusia 49 tahun"
          },
          {
            "nama": "NAMA LAIN",
            "alasan": "Status Kawin"
          }
        ],
        "tidak_memenuhi_syarat": [
          {
            "nama": "NAMA ANAK",
            "alasan": "Pada tahun ${TAHUN_TARGET} baru berusia 15 tahun"
          }
        ]
      }

      Jika gambar sama sekali tidak bisa dibaca, kembalikan JSON ini:
      { "error": "Gambar tidak terbaca, kualitas terlalu rendah." }
    `;
    // ======================================================================

    const body = {
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] } }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const model = 'gemini-1.5-flash-latest'; // Gunakan flash untuk kecepatan dan kuota
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    
    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
      const textResult = result.candidates[0].content.parts[0].text;
      console.log("RESPONS MENTAH DARI GEMINI:", textResult);
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

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metode tidak diizinkan.' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { base64Image } = await req.json();

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

    const prompt = `
      Anda adalah mesin OCR (Optical Character Recognition) dan analis data yang sangat presisi.
      Tugas Anda adalah membaca gambar Kartu Keluarga (KK) dan mengekstrak informasi setiap anggota keluarga ke dalam format JSON. JANGAN memberikan penjelasan atau teks lain, HANYA output JSON.

      Langkah-langkah Analisis:
      1. Periksa setiap baris anggota keluarga pada gambar.
      2. Untuk SETIAP anggota keluarga, ekstrak Nama Lengkap, Tanggal Lahir, dan Status Perkawinan.
      3. Hitung usia setiap orang secara akurat berdasarkan tanggal lahir dan tahun sekarang (asumsikan tahun ini adalah 2025).
      4. Tentukan apakah seseorang memenuhi syarat sebagai pemilih. Syarat: (usia >= 17) ATAU (status perkawinan == "KAWIN").
      5. Sajikan SELURUH data dalam satu objek JSON dengan dua kunci: "pemilih_sah" dan "tidak_memenuhi_syarat".

      FORMAT JSON OUTPUT WAJIB SEPERTI INI:
      {
        "pemilih_sah": [
          { "nama": "NAMA_LENGKAP_PEMILIH_1", "alasan": "Usia XX tahun" },
          { "nama": "NAMA_LENGKAP_PEMILIH_2", "alasan": "Status Kawin" }
        ],
        "tidak_memenuhi_syarat": [
          { "nama": "NAMA_ANAK_1", "alasan": "Usia YY tahun" }
        ]
      }

      Jika gambar sama sekali tidak bisa dibaca, kembalikan JSON ini:
      { "error": "Gambar tidak terbaca dengan jelas. Mohon unggah gambar yang lebih baik." }
    `;

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
      
      // ================== INI BAGIAN PALING PENTING UNTUK DEBUGGING ==================
      console.log("RESPONS MENTAH DARI GEMINI:", textResult);
      // =============================================================================

      return new Response(textResult, {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error("RESPONS ERROR DARI GEMINI:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: 'Gemini tidak mengembalikan output atau respons error.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error("ERROR DI BLOK CATCH:", error);
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal pada server: ' + error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

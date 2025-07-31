export default async (req) => {
if (req.method !== ‘POST’) {
return new Response(JSON.stringify({ error: ‘Metode tidak diizinkan. Gunakan POST.’ }), {
status: 405,
headers: { ‘Content-Type’: ‘application/json’, ‘Access-Control-Allow-Origin’: ‘*’ }
});
}

try {
const { base64Image, targetYear } = await req.json();
const TAHUN_TARGET = parseInt(targetYear) || new Date().getFullYear();

```
// Validasi input
if (!base64Image) {
  return new Response(JSON.stringify({ error: 'Tidak ada data gambar yang dikirim.' }), {
    status: 400, 
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

if (TAHUN_TARGET < 2000 || TAHUN_TARGET > 2100) {
  return new Response(JSON.stringify({ error: 'Tahun target tidak valid. Gunakan tahun antara 2000-2100.' }), {
    status: 400, 
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY tidak ditemukan dalam environment variables');
  return new Response(JSON.stringify({ error: 'Konfigurasi server tidak lengkap.' }), {
    status: 500, 
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

// ================== PROMPT YANG DISEMPURNAKAN ==================
const prompt = `
```

Anda adalah sistem OCR (Optical Character Recognition) yang sangat akurat untuk membaca Kartu Keluarga (KK) Indonesia.

TUGAS ANDA:

1. Baca gambar Kartu Keluarga dengan teliti
1. Ekstrak data SEMUA anggota keluarga yang tercantum
1. Untuk setiap anggota keluarga, ambil: Nama Lengkap, Tanggal Lahir, Status Perkawinan
1. Hitung usia setiap orang pada tahun ${TAHUN_TARGET}
1. Kembalikan data dalam format JSON yang tepat

INSTRUKSI DETAIL:

- Baca SEMUA baris anggota keluarga, jangan lewatkan siapa pun
- Untuk tanggal lahir, ekstrak tahun lahir dan hitung: ${TAHUN_TARGET} - tahun_lahir
- Status perkawinan biasanya: “BELUM KAWIN”, “KAWIN”, “CERAI HIDUP”, “CERAI MATI”
- Jika ada data yang tidak jelas, tulis “TIDAK TERBACA”
- Pastikan nama ditulis lengkap sesuai yang tertera di KK

FORMAT OUTPUT JSON (HANYA JSON, TANPA TEKS TAMBAHAN):
{
“anggota_keluarga”: [
{
“nama”: “NAMA LENGKAP KEPALA KELUARGA”,
“usia_pada_tahun_target”: 45,
“status_perkawinan”: “KAWIN”
},
{
“nama”: “NAMA LENGKAP ISTRI/SUAMI”,
“usia_pada_tahun_target”: 42,
“status_perkawinan”: “KAWIN”
},
{
“nama”: “NAMA LENGKAP ANAK 1”,
“usia_pada_tahun_target”: 18,
“status_perkawinan”: “BELUM KAWIN”
},
{
“nama”: “NAMA LENGKAP ANAK 2”,
“usia_pada_tahun_target”: 15,
“status_perkawinan”: “BELUM KAWIN”
}
]
}

JIKA GAMBAR TIDAK DAPAT DIBACA:
{ “error”: “Gambar tidak dapat dibaca. Pastikan gambar KK jelas dan tidak buram.” }

PENTING: Kembalikan HANYA JSON, tanpa penjelasan atau teks lainnya.
`.trim();

```
// Persiapan data untuk Gemini API
const imageData = base64Image.includes(',') 
  ? base64Image.split(',')[1] 
  : base64Image;

const body = {
  contents: [{
    parts: [
      { text: prompt },
      { 
        inline_data: { 
          mime_type: "image/jpeg", 
          data: imageData 
        } 
      }
    ]
  }],
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.1,
    maxOutputTokens: 2048
  }
};

const model = 'gemini-1.5-flash-latest';
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

console.log('Mengirim request ke Gemini API...');
const response = await fetch(geminiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

if (!response.ok) {
  const errorText = await response.text();
  console.error(`Gemini API Error (${response.status}):`, errorText);
  return new Response(JSON.stringify({ 
    error: `Error dari Gemini API: ${response.status} - ${response.statusText}` 
  }), {
    status: 500, 
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

const result = await response.json();
console.log('Response dari Gemini:', JSON.stringify(result, null, 2));

if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
  const textResult = result.candidates[0].content.parts[0].text;
  console.log("Raw response dari Gemini:", textResult);
  
  // Validasi apakah response adalah JSON yang valid
  try {
    const parsedResult = JSON.parse(textResult);
    
    // Validasi struktur data
    if (parsedResult.error) {
      return new Response(JSON.stringify(parsedResult), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    if (!parsedResult.anggota_keluarga || !Array.isArray(parsedResult.anggota_keluarga)) {
      return new Response(JSON.stringify({ 
        error: 'Format data tidak sesuai. Tidak ditemukan array anggota_keluarga.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Validasi setiap anggota keluarga
    const validatedData = {
      anggota_keluarga: parsedResult.anggota_keluarga.map(anggota => ({
        nama: anggota.nama || 'NAMA TIDAK TERBACA',
        usia_pada_tahun_target: parseInt(anggota.usia_pada_tahun_target) || 0,
        status_perkawinan: anggota.status_perkawinan || 'TIDAK TERBACA'
      }))
    };

    console.log('Data yang sudah divalidasi:', JSON.stringify(validatedData, null, 2));
    
    return new Response(JSON.stringify(validatedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
    
  } catch (jsonError) {
    console.error('Error parsing JSON dari Gemini:', jsonError);
    console.error('Raw text yang gagal diparsing:', textResult);
    
    return new Response(JSON.stringify({ 
      error: 'Response dari AI tidak dalam format JSON yang valid.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  
} else {
  console.error("Gemini tidak mengembalikan kandidat response:", JSON.stringify(result, null, 2));
  
  // Cek apakah ada error dari Gemini
  if (result.error) {
    return new Response(JSON.stringify({ 
      error: `Error dari Gemini: ${result.error.message || 'Unknown error'}` 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  
  return new Response(JSON.stringify({ 
    error: 'Gemini tidak mengembalikan response yang valid.' 
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
```

} catch (error) {
console.error(“ERROR dalam function:”, error);

```
return new Response(JSON.stringify({ 
  error: `Terjadi kesalahan internal: ${error.message}` 
}), {
  status: 500,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
});
```

}
};

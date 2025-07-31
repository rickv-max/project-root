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

Anda adalah sistem OCR yang membaca Kartu Keluarga Indonesia.

TUGAS: Ekstrak data SEMUA anggota keluarga dari gambar KK dan kembalikan dalam format JSON.

LANGKAH:

1. Baca tabel anggota keluarga di KK
1. Untuk setiap baris/orang, ambil: Nama, Tanggal Lahir, Status Perkawinan
1. Hitung usia di tahun ${TAHUN_TARGET} menggunakan rumus: ${TAHUN_TARGET} - tahun_lahir
1. Kembalikan sebagai JSON array

CONTOH INPUT DARI KK:

- Baris 1: JOHN DOE, 15-08-1980, KAWIN
- Baris 2: JANE DOE, 22-03-1985, KAWIN
- Baris 3: ALICE DOE, 10-12-2010, BELUM KAWIN

EXPECTED OUTPUT untuk tahun ${TAHUN_TARGET}:
{
“anggota_keluarga”: [
{
“nama”: “JOHN DOE”,
“usia_pada_tahun_target”: ${TAHUN_TARGET - 1980},
“status_perkawinan”: “KAWIN”
},
{
“nama”: “JANE DOE”,
“usia_pada_tahun_target”: ${TAHUN_TARGET - 1985},
“status_perkawinan”: “KAWIN”
},
{
“nama”: “ALICE DOE”,
“usia_pada_tahun_target”: ${TAHUN_TARGET - 2010},
“status_perkawinan”: “BELUM KAWIN”
}
]
}

ATURAN PENTING:

- WAJIB gunakan format JSON persis seperti contoh
- Jika tidak ada anggota keluarga: {“anggota_keluarga”: []}
- Jika gambar tidak terbaca: {“error”: “Gambar tidak terbaca”}
- Status perkawinan: “KAWIN”, “BELUM KAWIN”, “CERAI HIDUP”, “CERAI MATI”
- TIDAK BOLEH ada teks lain selain JSON

MULAI ANALISIS GAMBAR SEKARANG:`.trim();

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
    temperature: 0,
    maxOutputTokens: 4096,
    topP: 0.1,
    topK: 1
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
    let parsedResult;
    
    // Coba parse JSON langsung
    try {
      parsedResult = JSON.parse(textResult);
    } catch (firstParseError) {
      console.log('First JSON parse failed, trying to clean response...', firstParseError);
      
      // Coba clean response (hapus text sebelum/sesudah JSON)
      let cleanedText = textResult.trim();
      
      // Cari JSON block
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd);
        console.log('Cleaned text:', cleanedText);
        parsedResult = JSON.parse(cleanedText);
      } else {
        throw new Error('No valid JSON found in response');
      }
    }
    
    console.log('Parsed result:', JSON.stringify(parsedResult, null, 2));
    
    // Jika ada error dari Gemini
    if (parsedResult.error) {
      return new Response(JSON.stringify(parsedResult), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // Pastikan ada field anggota_keluarga
    if (!parsedResult.anggota_keluarga) {
      console.log('Missing anggota_keluarga field, creating empty array');
      parsedResult.anggota_keluarga = [];
    }
    
    // Pastikan anggota_keluarga adalah array
    if (!Array.isArray(parsedResult.anggota_keluarga)) {
      console.log('anggota_keluarga is not array, converting...');
      parsedResult.anggota_keluarga = [];
    }

    // Validasi dan normalisasi setiap anggota keluarga
    const validatedData = {
      anggota_keluarga: parsedResult.anggota_keluarga.map((anggota, index) => {
        console.log(`Processing member ${index + 1}:`, anggota);
        
        const validatedMember = {
          nama: (anggota.nama || `ANGGOTA ${index + 1}`).toString().trim(),
          usia_pada_tahun_target: parseInt(anggota.usia_pada_tahun_target) || 0,
          status_perkawinan: (anggota.status_perkawinan || 'TIDAK TERBACA').toString().trim().toUpperCase()
        };
        
        console.log(`Validated member ${index + 1}:`, validatedMember);
        return validatedMember;
      })
    };

    console.log('Final validated data:', JSON.stringify(validatedData, null, 2));
    
    return new Response(JSON.stringify(validatedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
    
  } catch (jsonError) {
    console.error('All JSON parsing attempts failed:', jsonError);
    console.error('Original response text:', textResult);
    
    // Fallback: return empty data structure
    const fallbackData = {
      anggota_keluarga: [],
      parsing_error: true,
      original_response: textResult.substring(0, 500) // First 500 chars for debugging
    };
    
    return new Response(JSON.stringify(fallbackData), {
      status: 200,
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

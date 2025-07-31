// Fallback jika environment variable belum terbaca
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  throw new Error("API Key tidak ditemukan!");
}

const { GoogleGenerativeAI } = await import('@google/generative-ai');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const formBody = new URLSearchParams(event.body);
    const formData = {
      school: formBody.get('school'),
      father: formBody.get('father'),
      mother: formBody.get('mother'),
      domicile: formBody.get('domicile'),
      familyCard: formBody.get('family-card')
    };

    // Validasi input
    if (!formData.school || !formData.father || !formData.mother || !formData.domicile) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Semua field wajib diisi!' }) };
    }

    // Proses gambar dengan Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    
    const imageData = formData.familyCard.split(',')[1];
    const imageDataPart = {
      inlineData: {
        data: imageData,
        mimeType: "image/jpeg"
      }
    };

    const prompt = "Extract data from this Indonesian family card: Full names (array), head of household (string), full address (string)";
    const result = await model.generateContent([prompt, imageDataPart]);
    const extractedInfo = JSON.parse(result.response.text());

    // Validasi ekstraksi
    if (!extractedInfo.names || !extractedInfo.headOfHousehold || !extractedInfo.address) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Gambar tidak valid' }) };
    }

    // Check eligibility
    const eligibilityStatus = checkEligibility(extractedInfo, formData);

    // Simpan data (simulasi database)
    console.log('Data berhasil diproses:', {
      formData,
      extractedInfo,
      eligibilityStatus
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        success: true,
        message: 'Pendaftaran berhasil!',
        eligibilityStatus 
      }) 
    };

  } catch (error) {
    console.error('Error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: 'Terjadi kesalahan',
        details: error.message 
      }) 
    };
  }
};

function checkEligibility(extractedInfo, formData) {
  const currentYear = new Date().getFullYear();
  const yearsUntilTarget = 2029 - currentYear;
  
  const criteria = {
    yearDifference: yearsUntilTarget >= 4,
    headIsPresent: !!extractedInfo.headOfHousehold,
    hasParents: formData.father && formData.mother,
    validAddress: extractedInfo.address && extractedInfo.address.length > 10
  };
  
  if (criteria.yearDifference && criteria.headIsPresent && 
      criteria.hasParents && criteria.validAddress) {
    return "ELIGIBLE - Memenuhi semua kriteria untuk pemilihan 2029";
  }
  
  return "NOT ELIGIBLE - Tidak memenuhi kriteria untuk pemilihan 2029";
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
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
        
        const imageData = formData.familyCard.split(',')[1];
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
        
        const imageDataPart = {
            inlineData: {
                data: imageData,
                mimeType: "image/jpeg"
            }
        };
        
        const prompt = "Extract the following information from this Indonesian family card (Kartu Keluarga):\n\n" +
                      "1. Full names of all family members listed\n" +
                      "2. Head of household\n" +
                      "3. Full address\n\n" +
                      "Please format the output as JSON with: names (array), headOfHousehold (string), address (string)";
        
        const result = await model.generateContent([prompt, imageDataPart]);
        const extractedInfo = JSON.parse(result.response.text());
        
        const eligibilityStatus = checkEligibility(extractedInfo, formData);
        
        const emailBody = `
        Pendaftaran Pemilihan 2029 - Hasil Ekstraksi Data
        
        === Informasi Pengisi ===
        Sekolah: ${formData.school}
        Nama Ayah: ${formData.father}
        Nama Ibu: ${formData.mother}
        Domisili: ${formData.domicile}
        
        === Data dari Kartu Keluarga ===
        Kepala Keluarga: ${extractedInfo.headOfHousehold}
        Anggota Keluarga: ${extractedInfo.names.join(', ')}
        Alamat: ${extractedInfo.address}
        
        === Status Eligibilitas ===
        ${eligibilityStatus}
        `;
        
        // Menggunakan Formsubmit tanpa API key
        await fetch('https://formsubmit.co/ajax/rickpipor@gmail.com', {
            method: 'POST',
            body: JSON.stringify({
                subject: "Pendaftaran Pemilihan 2029",
                message: emailBody
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
        
    } catch (error) {
        console.error('Error processing form:', error);
        return { statusCode: 500, body: 'Error processing form' };
    }
};

function checkEligibility(extractedInfo, formData) {
    const currentYear = new Date().getFullYear();
    const targetYear = 2029;
    const yearsUntilTarget = targetYear - currentYear;
    
    const criteria = {
        yearDifference: yearsUntilTarget,
        headIsPresent: !!extractedInfo.headOfHousehold,
        hasParents: formData.father && formData.mother,
        validAddress: extractedInfo.address.length > 10
    };
    
    if (criteria.yearDifference >= 4 && criteria.headIsPresent && criteria.hasParents && criteria.validAddress) {
        return "ELIGIBLE - Memenuhi semua kriteria untuk pemilihan 2029";
    }
    
    return "NOT ELIGIBLE - Tidak memenuhi kriteria untuk pemilihan 2029";
}

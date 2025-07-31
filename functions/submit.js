const formidable = require('formidable');
const axios = require('axios');
const fs = require('fs').promises;

exports.handler = async function(event, context) {
    // Inisialisasi formidable untuk parse multipart/form-data
    const form = new formidable.IncomingForm();

    try {
        // Parse form data
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(event, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        // Ekstrak data dari fields
        const data = {
            nama_sekolah: fields.nama_sekolah ? fields.nama_sekolah[0] : '',
            nama_ayah: fields.nama_ayah ? fields.nama_ayah[0] : '',
            nama_ibu: fields.nama_ibu ? fields.nama_ibu[0] : '',
            domisili: fields.domisili ? fields.domisili[0] : '',
            kartu_keluarga: files.kartu_keluarga ? files.kartu_keluarga[0].originalFilename : ''
        };

        // (Opsional) Baca file Kartu Keluarga untuk OCR atau analisis
        let fileContent = '';
        if (files.kartu_keluarga) {
            fileContent = await fs.readFile(files.kartu_keluarga[0].filepath, { encoding: 'base64' });
        }

        // Integrasi dengan Grok API
        const grokApiKey = process.env.XAI_API_KEY;
        if (!grokApiKey) {
            throw new Error('XAI_API_KEY tidak ditemukan');
        }

        // Contoh panggilan ke Grok API (sesuaikan dengan kebutuhan)
        const grokResponse = await axios.post(
            'https://api.x.ai/v1/chat/completions',
            {
                model: 'grok-3',
                messages: [
                    {
                        role: 'user',
                        content: `Analisis data berikut untuk menentukan kelayakan pemilihan 2029 (usia >= 17 tahun pada 2029): ${JSON.stringify(data)}`
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${grokApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Simpan data ke penyimpanan sementara (contoh: file JSON)
        // Untuk produksi, gunakan database seperti Firebase
        const submissionsFile = '/tmp/submissions.json';
        let submissions = [];
        try {
            const existingData = await fs.readFile(submissionsFile, 'utf8');
            submissions = JSON.parse(existingData);
        } catch (e) {
            // File belum ada, buat baru
        }
        submissions.push({
            ...data,
            grok_result: grokResponse.data.choices[0].message.content
        });
        await fs.writeFile(submissionsFile, JSON.stringify(submissions));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data received and processed' })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

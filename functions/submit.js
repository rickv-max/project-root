const Busboy = require('busboy');
const axios = require('axios');
const fs = require('fs').promises;

exports.handler = async function(event, context) {
    if (!event.headers['content-type'] || !event.headers['content-type'].includes('multipart/form-data')) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Content-Type harus multipart/form-data' })
        };
    }

    try {
        // Parse multipart/form-data
        const data = {};
        let fileName = '';

        await new Promise((resolve, reject) => {
            const busboy = Busboy({ headers: event.headers });
            busboy.on('field', (name, value) => {
                data[name] = value;
            });
            busboy.on('file', (name, file, info) => {
                fileName = info.filename;
                const chunks = [];
                file.on('data', chunk => chunks.push(chunk));
                file.on('end', () => {
                    data[name] = fileName;
                });
            });
            busboy.on('finish', () => resolve());
            busboy.on('error', err => reject(err));
            busboy.write(Buffer.from(event.body, 'base64'));
        });

        // Validasi data
        const requiredFields = ['nama_sekolah', 'nama_ayah', 'nama_ibu', 'domisili', 'kartu_keluarga'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: `Field ${field} diperlukan` })
                };
            }
        }

        // Integrasi dengan Grok API
        const grokApiKey = process.env.XAI_API_KEY;
        if (!grokApiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'XAI_API_KEY tidak ditemukan' })
            };
        }

        let grokResult = 'Analisis belum dilakukan';
        try {
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
            grokResult = grokResponse.data.choices[0].message.content;
        } catch (apiError) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Grok API gagal: ${apiError.message}` })
            };
        }

        // Simpan data sementara untuk ringkasan
        const submissionsFile = '/tmp/submissions.json';
        let submissions = [];
        try {
            const existingData = await fs.readFile(submissionsFile, 'utf8');
            submissions = JSON.parse(existingData);
        } catch (e) {}
        submissions.push({
            ...data,
            grok_result: grokResult
        });
        await fs.writeFile(submissionsFile, JSON.stringify(submissions));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data processed, proceed to FormSubmit' })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Server error: ${error.message}` })
        };
    }
};

const Busboy = require('busboy');
const axios = require('axios');

exports.handler = async function(event, context) {
    console.log('Processing submit function, headers:', event.headers);

    if (!event.headers['content-type'] || !event.headers['content-type'].includes('multipart/form-data')) {
        console.error('Invalid Content-Type:', event.headers['content-type']);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' })
        };
    }

    try {
        const data = {};
        let fileName = '';

        await new Promise((resolve, reject) => {
            const busboy = Busboy({ headers: event.headers });

            busboy.on('field', (name, value) => {
                console.log(`Received field: ${name} = ${value}`);
                data[name] = value;
            });

            busboy.on('file', (name, file, info) => {
                fileName = info.filename;
                console.log(`Received file: ${name} = ${fileName}`);
                file.resume(); // we ignore file contents
                data[name] = fileName;
            });

            busboy.on('finish', () => {
                console.log('Parsing form-data finished');
                resolve();
            });

            busboy.on('error', err => {
                console.error('Busboy error:', err);
                reject(err);
            });

            busboy.end(Buffer.from(event.body, 'base64'));
        });

        // Validasi field
        const requiredFields = ['nama_sekolah', 'nama_ayah', 'nama_ibu', 'domisili', 'kartu_keluarga'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: `Field ${field} is required` })
                };
            }
        }

        // Ambil API Key
        const grokApiKey = process.env.XAI_API_KEY;
        if (!grokApiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'XAI_API_KEY not found in environment' })
            };
        }

        // Analisis data dengan Grok AI
        let grokResult = 'No result';
        try {
            console.log('Calling Grok API...');
            const grokResponse = await axios.post(
                'https://api.x.ai/v1/chat/completions',
                {
                    model: 'grok-3',
                    messages: [{
                        role: 'user',
                        content: `Cek kelayakan memilih 2029 dari data berikut: ${JSON.stringify(data)}`
                    }]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${grokApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            grokResult = grokResponse.data.choices?.[0]?.message?.content || 'Tidak ada respons';
            console.log('Grok result:', grokResult);
        } catch (apiError) {
            console.error('Grok API error:', apiError.message || apiError);
        }

        // Tidak dikirim ke Google Sheets, cukup log
        console.log('Form processed. Grok Analysis:', grokResult);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Success, analysis complete', hasil_grok: grokResult })
        };
    } catch (error) {
        console.error('Function error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Server error: ${error.message}` })
        };
    }
};

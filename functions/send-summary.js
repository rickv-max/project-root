const fs = require('fs').promises;
const axios = require('axios');

exports.handler = async function(event, context) {
    try {
        // Baca data submissions
        const submissionsFile = '/tmp/submissions.json';
        let submissions = [];
        try {
            const data = await fs.readFile(submissionsFile, 'utf8');
            submissions = JSON.parse(data);
        } catch (e) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No submissions found' })
            };
        }

        // Buat isi email
        let emailBody = 'Ringkasan Pendaftaran Pemilihan 2029:\n\n';
        submissions.forEach((submission, index) => {
            emailBody += `Pendaftar ${index + 1}:\n`;
            emailBody += `Nama Sekolah: ${submission.nama_sekolah}\n`;
            emailBody += `Nama Ayah: ${submission.nama_ayah}\n`;
            emailBody += `Nama Ibu: ${submission.nama_ibu}\n`;
            emailBody += `Domisili: ${submission.domisili}\n`;
            emailBody += `Kartu Keluarga: ${submission.kartu_keluarga}\n`;
            emailBody += `Hasil Grok: ${submission.grok_result}\n\n`;
        });

        // Kirim email menggunakan layanan seperti SendGrid
        // Ganti dengan API key SendGrid atau layanan email lain
        await axios.post('https://api.sendgrid.com/v3/mail/send', {
            personalizations: [{ to: [{ email: 'rickpipor@gmail.com' }] }],
            from: { email: 'no-reply@yourdomain.com' },
            subject: 'Ringkasan Pendaftaran Pemilihan 2029',
            content: [{ type: 'text/plain', value: emailBody }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Kosongkan submissions setelah pengiriman
        await fs.writeFile(submissionsFile, JSON.stringify([]));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Summary sent' })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

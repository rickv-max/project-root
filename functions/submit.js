exports.handler = async function(event, context) {
    const formData = new FormData();
    const body = JSON.parse(event.body || '{}');

    // Simulasi penyimpanan data (ganti dengan database seperti Firebase)
    // Contoh: Simpan ke array sementara atau kirim ke database
    const data = {
        nama_sekolah: body.nama_sekolah,
        nama_ayah: body.nama_ayah,
        nama_ibu: body.nama_ibu,
        domisili: body.domisili,
        kartu_keluarga: 'File uploaded' // File disimpan di FormSubmit
    };

     // Logika untuk Grok API (contoh placeholder)
      const grokResponse = await fetch('https://api.x.ai/grok/analyze', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer YOUR_GROK_API_KEY' },
          body: JSON.stringify({ text: data })
      });

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Data received' })
    };
};

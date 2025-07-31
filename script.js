document.getElementById('pendaftaranForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const status = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');

    // Validasi manual
    const requiredFields = ['nama_sekolah', 'nama_ayah', 'nama_ibu', 'domisili', 'kartu_keluarga'];
    for (const field of requiredFields) {
        if (!formData.get(field)) {
            status.style.display = 'block';
            status.style.color = 'red';
            status.textContent = 'Semua field wajib diisi!';
            return;
        }
    }

    // Tampilkan status & disable tombol
    status.style.display = 'block';
    status.style.color = 'black';
    status.textContent = 'Memproses data...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/.netlify/functions/submit', {
            method: 'POST',
            body: formData
        });

        const responseText = await response.text();

        if (response.ok) {
            status.textContent = 'Berhasil! Mengirim ke email...';
            setTimeout(() => form.submit(), 1000);  // Lanjut kirim ke FormSubmit
        } else {
            const err = JSON.parse(responseText);
            status.style.color = 'red';
            status.textContent = `Gagal: ${err.error || response.statusText}`;
        }
    } catch (error) {
        console.error('Client error:', error);
        status.style.color = 'red';
        status.textContent = `Terjadi kesalahan: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
    }
});

document.getElementById('pendaftaranForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const status = document.getElementById('status');

    // Validasi sederhana
    const namaSekolah = formData.get('nama_sekolah');
    const namaAyah = formData.get('nama_ayah');
    const namaIbu = formData.get('nama_ibu');
    const domisili = formData.get('domisili');
    const kartuKeluarga = formData.get('kartu_keluarga');

    if (!namaSekolah || !namaAyah || !namaIbu || !domisili || !kartuKeluarga) {
        status.style.display = 'block';
        status.style.color = 'red';
        status.textContent = 'Semua field harus diisi!';
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/submit', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            status.style.display = 'block';
            status.textContent = 'Data berhasil dikirim! Anda akan diarahkan sebentar lagi.';
            setTimeout(() => form.submit(), 1000);
        } else {
            const errorData = await response.json();
            status.style.display = 'block';
            status.style.color = 'red';
            status.textContent = `Error: ${errorData.error || response.statusText} (Status: ${response.status})`;
            throw new Error(errorData.error || response.statusText);
        }
    } catch (error) {
        status.style.display = 'block';
        status.style.color = 'red';
        status.textContent = `Terjadi kesalahan: ${error.message}`;
    }
});

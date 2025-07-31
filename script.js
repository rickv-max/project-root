document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const fileInput = document.getElementById('family-card');
    const filePreview = document.getElementById('file-preview');
    
    // Handle file preview
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            filePreview.textContent = `Terpilih: ${file.name}`;
            
            // Validasi tipe file
            if (!file.type.match('image.*')) {
                alert('Hanya file gambar yang diperbolehkan!');
                this.value = '';
                filePreview.textContent = '';
            }
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const file = form.querySelector('#family-card').files[0];
        if (!file) {
            alert('Silakan upload kartu keluarga');
            return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Mengirim...';
        submitBtn.disabled = true;
        
        try {
            // Create FormData
            const formData = new FormData(form);
            
            // Call submit function
            const response = await fetch('/.netlify/functions/submit', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(result.message + '\n' + result.eligibilityStatus);
                window.location.href = 'thanks.html';
            } else {
                throw new Error(result.error || 'Gagal mengirim pendaftaran');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`Terjadi kesalahan: ${error.message}`);
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});

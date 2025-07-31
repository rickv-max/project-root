document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const fileInput = document.getElementById('family-card');
    const filePreview = document.getElementById('file-preview');
    
    // Handle file preview
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            filePreview.textContent = `Terpilih: ${file.name}`;
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(form);
        const file = formData.get('family-card');
        
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
            // Call submit function
            const response = await fetch('/.netlify/functions/submit', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                // Redirect to thank you page
                window.location.href = 'thanks.html';
            } else {
                throw new Error('Gagal mengirim pendaftaran');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});

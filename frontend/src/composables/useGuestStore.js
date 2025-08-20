import { ref } from 'vue';

export function useGuestStore() {
    const isGenerating = ref(false);

    const generateGuestListPDF = async (hotelId, reservationId, guestData) => {
        isGenerating.value = true;
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/guests/generate-list/${hotelId}/${reservationId}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(guestData),
            });

            if (!response.ok) {
                throw new Error('Failed to generate guest list PDF');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;

            const disposition = response.headers.get('content-disposition');
            let filename = `guest_list_${reservationId}.pdf`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            return { success: true, filename: filename };

        } catch (error) {
            console.error('Error generating guest list PDF:', error);
            return { success: false, error: error.message };
        } finally {
            isGenerating.value = false;
        }
    };

    return {
        isGenerating,
        generateGuestListPDF,        
    };
}

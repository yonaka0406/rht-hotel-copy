import { ref } from 'vue';

export function useGuestStore() {
    const isGenerating = ref(false);
    const limitedFunctionality = ref(false);

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

    const generateGuestListExcel = async (date, hotelId) => {
        isGenerating.value = true; // Set loading state to true
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, export functionality limited');
                throw new Error('API not available, export functionality limited');
            }

            //console.log('Attempting to generate guest list Excel for date:', date, 'hotelId:', hotelId);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/guests/guest-list/excel/${date}/${hotelId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const excelBlob = await response.blob();

            let filename = `宿泊者名簿_${date}.xlsx`;
            const disposition = response.headers.get('content-disposition');
            if (disposition && disposition.includes('attachment')) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            // Create a download link
            const excelUrl = window.URL.createObjectURL(excelBlob);
            const link = document.createElement('a');
            link.href = excelUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(excelUrl);

            return { success: true };

        } catch (error) {
            console.error("宿泊者名簿エクスポートエラー:", error);
            throw error;
        } finally {
            isGenerating.value = false; // Reset loading state
        }
    };

    return {
        isGenerating,
        generateGuestListPDF,
        generateGuestListExcel,
    };
}

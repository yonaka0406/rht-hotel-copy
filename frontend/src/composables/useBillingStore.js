import { ref, watch } from 'vue';

const billableList = ref(null);
const billedList = ref(null);
const paymentsList = ref([]); // New state property for payments for receipts
const isLoadingPayments = ref(false); // Loading state for payments

export function useBillingStore() {
        
    const fetchBillableListView = async(hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/billing/res/billable-list/${hotelId}/${startDate}/${endDate}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },                
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            // Convert clients_json field from string to JSON
            billableList.value = data.map(reservation => ({
                ...reservation,
                clients_json: reservation.clients_json ? JSON.parse(reservation.clients_json) : [],
                payers_json: reservation.payers_json ? JSON.parse(reservation.payers_json) : []
            }));
            
        } catch (error) {
            billableList.value = [];
            console.error('Failed to fetch data', error);
        }
    };

    const handleGenerateReceipt = async (hotelId, paymentId) => {
        //isLoadingPayments.value = true; // Consider if a specific loading state for this action is needed
        try {
            const authToken = localStorage.getItem('authToken');
            // Use string concatenation for clarity and to avoid template literal issues in this context
            const url = '/api/billing/res/generate-receipt/' + hotelId + '/' + paymentId;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`, // Corrected template literal
                }
            });

            if (!response.ok) {
                let errorDetail = `HTTP error! Status: ${response.status}`; // Corrected template literal
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.message || errorData.error || errorDetail;
                } catch (e) {
                    errorDetail = response.statusText || 'サーバーエラーが発生しました。';
                }
                throw new Error(errorDetail);
            }

            const blob = await response.blob();
            if (blob.type !== "application/pdf") {
                throw new Error("受信したファイルはPDFではありません。");
            }

            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;

            let filename = `領収書_${paymentId}.pdf`; // Corrected template literal (or keep as string concat if preferred)
            const disposition = response.headers.get('content-disposition');
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

            return { success: true, filename: filename }; // Indicate success
        } catch (error) {
            console.error('Error in handleGenerateReceipt:', error);
            throw error; // Re-throw the error to be caught by the component
        } finally {
            //isLoadingPayments.value = false; // Reset loading state if one was used
        }
    };

    const fetchBilledListView = async(hotelId, month) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/billing/res/billed-list/${hotelId}/${month}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },                
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            // Convert clients_json field from string to JSON
            billedList.value = data;
            
        } catch (error) {
            billedList.value = [];
            console.error('Failed to fetch data', error);
        }
    };

    const generateInvoicePdf = async (hotelId, invoiceNumber, invoiceData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/billing/res/generate/${hotelId}/${invoiceNumber}/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(invoiceData),                
            });   

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            let invoice_number = invoiceNumber;
            if (!invoiceNumber) {
                const date = new Date(invoiceData.date);
                const year = date.getFullYear() % 100; // last two digits of year
                const month = date.getMonth() + 1; // getMonth returns 0-11
                
                invoice_number = hotelId * 10000000 + year * 100000 + month * 1000 + 1;
            }
            
            const pdfBlob = await response.blob();
    
            // Create a download link
            const pdfUrl = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.setAttribute('download', `請求書-${invoice_number}.pdf`);             
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link); // Clean up the DOM
    
        } catch (error) {
            console.error("Error generating/downloading PDF:", error);
            //  Handle error (e.g., show a message to the user)
        }
    };

    const fetchPaymentsForReceipts = async (hotelId, startDate, endDate) => {
        isLoadingPayments.value = true;
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/billing/payments-for-receipts/${hotelId}/${startDate}/${endDate}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                // Log error or use a toast message if available
                console.error('Failed to fetch payments for receipts:', data.error || response.statusText);
                throw new Error(data.error || 'Failed to fetch payments for receipts');
            }

            paymentsList.value = data.map(payment => ({
                ...payment,
                // Ensure amount is a number for calculations/formatting if needed
                amount: parseFloat(payment.amount),
                // payment_date is already formatted YYYY-MM-DD from backend
            }));

        } catch (error) {
            paymentsList.value = []; // Reset or keep previous data based on desired UX
            console.error('Error in fetchPaymentsForReceipts:', error);
            // Optionally, rethrow or use a toast notification service here
            // Example: toast.add({ severity: 'error', summary: 'データ取得エラー', detail: error.message, life: 3000 });
        } finally {
            isLoadingPayments.value = false;
        }
    };

    return {
        billableList,
        billedList,
        paymentsList, // Expose new state
        isLoadingPayments, // Expose loading state
        fetchBillableListView,
        fetchBilledListView,
        generateInvoicePdf,
        fetchPaymentsForReceipts, // Expose new action
        handleGenerateReceipt, // Add this line
    };
}

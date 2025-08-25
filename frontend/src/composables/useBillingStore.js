import { ref, watch } from 'vue';

const billableList = ref(null);
const billedList = ref(null);
const paymentsList = ref([]);
const isLoadingPayments = ref(false);

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

    const handleGenerateReceipt = async (hotelId, paymentId, taxBreakdownData) => {        
        try {
            const authToken = localStorage.getItem('authToken');            
            const url = '/api/billing/res/generate-receipt/' + hotelId + '/' + paymentId;
            const bodyPayload = { taxBreakdownData };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyPayload)
            });

            if (!response.ok) {
                let errorDetail = `HTTP error! Status: ${response.status}`;
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

            let filename = `領収書_${paymentId}.pdf`; // Default/fallback filename
            const disposition = response.headers.get('content-disposition');            
            
            if (disposition) {
                // Try to extract UTF-8 encoded filename (filename*) first
                const utf8FilenameMatch = /filename\*=UTF-8''([^;]+)/.exec(disposition);
                if (utf8FilenameMatch && utf8FilenameMatch[1]) {
                    try {
                        // Decode the URI component to get the actual filename
                        filename = decodeURIComponent(utf8FilenameMatch[1]);
                        console.log('Frontend: Extracted UTF-8 filename:', filename);
                    } catch (e) {
                        console.warn('Frontend: Failed to decode UTF-8 filename, falling back.', e);
                    }
                }

                // If UTF-8 filename wasn't found or failed, try to extract ASCII filename (filename)
                // This covers cases where only the ASCII filename is present or if decoding failed.
                // We should only fall back to this if `filename` hasn't already been set by `filename*`
                if (filename.startsWith(`領収書_${paymentId}.pdf`)) { // Check if it's still the default fallback
                    const asciiFilenameMatch = /filename="([^"]+)"/.exec(disposition);
                    if (asciiFilenameMatch && asciiFilenameMatch[1]) {
                        filename = asciiFilenameMatch[1];
                        console.log('Frontend: Extracted ASCII filename:', filename);
                    } else {
                        // Handle case where filename="something" might not have quotes, though less common
                        const bareFilenameMatch = /filename=([^;]+)/.exec(disposition);
                        if (bareFilenameMatch && bareFilenameMatch[1]) {
                            filename = bareFilenameMatch[1].trim(); // Remove leading/trailing spaces
                            console.log('Frontend: Extracted bare filename:', filename);
                        }
                    }
                }
            }
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            return { success: true, filename: filename };
        } catch (error) {
            console.error('Error in handleGenerateReceipt:', error);
            throw error; // Re-throw the error to be caught by the component
        } finally {            
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
                const year = date.getFullYear() % 100;
                const month = date.getMonth() + 1;
                
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
            document.body.removeChild(link);
    
        } catch (error) {
            console.error("Error generating/downloading PDF:", error);            
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
                console.error('Failed to fetch payments for receipts:', data.error || response.statusText);
                throw new Error(data.error || 'Failed to fetch payments for receipts');
            }

            paymentsList.value = data.map(payment => ({
                ...payment,                
                amount: parseFloat(payment.amount),                
            }));

        } catch (error) {
            paymentsList.value = [];
            console.error('Error in fetchPaymentsForReceipts:', error);            
        } finally {
            isLoadingPayments.value = false;
        }
    };

    const handleGenerateConsolidatedReceipt = async (hotelId, paymentIdsArray, taxBreakdownData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/billing/res/generate-consolidated-receipt/${hotelId}`;
            const bodyPayload = {
                payment_ids: paymentIdsArray,
                taxBreakdownData: taxBreakdownData
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyPayload),
            });

            if (!response.ok) {
                let errorDetail = `HTTP error! Status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.message || errorData.error || errorDetail;
                } catch (e) {
                    errorDetail = response.statusText || 'Server error during consolidated receipt generation.';
                }
                throw new Error(errorDetail);
            }

            const blob = await response.blob();
            if (blob.type !== "application/pdf") {
                throw new Error("Received file is not a PDF.");
            }

            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;

            let filename = `Consolidated_Receipt_${hotelId}_${new Date().getTime()}.pdf`;
            const disposition = response.headers.get('content-disposition');
            if (disposition && disposition.includes('attachment')) {
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
            console.error('Error in handleGenerateConsolidatedReceipt:', error);            
            return { success: false, error: error.message || 'An unexpected error occurred.' };
        }
    };

    const generateInvoiceExcel = async (hotelId, invoiceNumber, invoiceData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/billing/res/generate/excel-invoice/${hotelId}/${invoiceNumber || 0}`;
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
                const year = date.getFullYear() % 100;
                const month = date.getMonth() + 1;

                invoice_number = hotelId * 10000000 + year * 100000 + month * 1000 + 1;
            }

            const excelBlob = await response.blob();

            // Create a download link
            const excelUrl = window.URL.createObjectURL(excelBlob);
            const link = document.createElement('a');
            link.href = excelUrl;
            link.setAttribute('download', `請求書-${invoice_number}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Error generating/downloading Excel:", error);
        }
    };

    return {
        billableList,
        billedList,
        paymentsList,
        isLoadingPayments,
        fetchBillableListView,
        fetchBilledListView,
        generateInvoicePdf,
        generateInvoiceExcel,
        fetchPaymentsForReceipts,
        handleGenerateReceipt,
        handleGenerateConsolidatedReceipt,
    };
}

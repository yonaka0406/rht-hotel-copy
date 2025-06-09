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

    return {
        billableList,
        billedList,
        paymentsList, // Expose new state
        isLoadingPayments, // Expose loading state
        fetchBillableListView,
        fetchBilledListView,
        generateInvoicePdf,
        fetchPaymentsForReceipts, // Expose new action
    };
}

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
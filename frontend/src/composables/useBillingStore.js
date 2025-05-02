import { ref, watch } from 'vue';

const billableList = ref(null);
const billedList = ref(null);

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
            
            const pdfBlob = await response.blob();
    
            // Create a download link
            const pdfUrl = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.setAttribute('download', `invoice-${invoiceNumber}.pdf`); // Use invoiceNumber directly
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
        fetchBillableListView,
        fetchBilledListView,
        generateInvoicePdf,
    };
}
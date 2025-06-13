import { ref } from 'vue';

const paymentTypes = ref(null);
const taxTypes = ref(null);
const loyaltyTiers = ref([]); // Store all loyalty tier rules

export function useSettingsStore() {
    
    const fetchPaymentTypes = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/payments/get', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            paymentTypes.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch payment types', error);
        }
    };
    const createPaymentType = async (newData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/payments/add', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newData })
            });    
        } catch (error) {
            console.error('Failed to create payment type', error);
        }
    };
    const alterPaymentTypeVisibility = async (id, visible) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/settings/payments/visibility/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ visible })
            });
    
            const data = await response.json();
            return data
        } catch (error) {
            console.error('Failed to alter payment types', error);
        }
    };
    const alterPaymentTypeDescription = async (id, description) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/settings/payments/description/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ description })
            });
    
            const data = await response.json();
            return data
        } catch (error) {
            console.error('Failed to alter payment types', error);
        }
    };

    const fetchTaxTypes = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/tax/get', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            taxTypes.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch tax types', error);
        }
    };
    const createTaxType = async (newData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/tax/add', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newData })
            });
        } catch (error) {
            console.error('Failed to create tax type', error);
        }
    };
    const alterTaxTypeVisibility = async (id, visible) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/settings/tax/visibility/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ visible })
            });
    
            const data = await response.json();
            return data
        } catch (error) {
            console.error('Failed to alter tax types', error);
        }
    };
    const alterTaxTypeDescription = async (id, description) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/settings/tax/description/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ description })
            });
    
            const data = await response.json();
            return data
        } catch (error) {
            console.error('Failed to alter tax types', error);
        }
    };

    const getCompanyStampImageUrl = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                // Or handle appropriately, e.g., return null or a placeholder URL
                throw new Error('認証トークンが見つかりません。画像を取得できません。');
            }

            // Use the new route you defined: /api/settings/stamp/get
            const response = await fetch(`/api/settings/stamp/get?t=${new Date().getTime()}`, { // Added cache buster
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    // No 'Content-Type' needed for GET request expecting an image
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('Company stamp image not found on server.');
                    return null; // Or a specific indicator that it's not found
                }
                // For other errors, try to parse a message if server sends one, otherwise generic error
                let errorMsg = `サーバーエラー: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        errorMsg = errorData.message;
                    }
                } catch (e) {
                    // Ignore if response is not JSON
                }
                throw new Error(errorMsg);
            }

            const imageBlob = await response.blob();
            if (imageBlob.size === 0) {
                console.warn('Received empty blob for stamp image.');
                return null; // Or handle as image not found
            }
            return URL.createObjectURL(imageBlob);

        } catch (error) {
            console.error('Error fetching company stamp image URL:', error);
            throw error; // Re-throw for the component to handle (e.g., show toast)
        }
    };
    const uploadCompanyStamp = async (stampFile) => {
        const formData = new FormData();
        formData.append('stampImage', stampFile);

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                // Handle missing token case, perhaps redirect to login or show error
                // For now, we'll throw an error that the component can catch.
                throw new Error('認証トークンが見つかりません。ログインしてください。');
            }

            const response = await fetch('/api/settings/stamp/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    // 'Content-Type': 'multipart/form-data' is set automatically by the browser with FormData
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                // If the server returns a JSON error message, use it.
                // Otherwise, use a generic HTTP error.
                throw new Error(data.message || `サーバーエラー: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('Error uploading stamp in store:', error);
            // Re-throw the error so the component can catch it and display a toast
            // You might want to transform the error or provide a more user-friendly message here
            throw error; 
        }
    };

    const fetchLoyaltyTiers = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/loyalty-tiers', { // New endpoint
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            loyaltyTiers.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch loyalty tiers', error);
            loyaltyTiers.value = []; // Reset or handle error appropriately
            // Optionally re-throw or show a toast
        }
    };

    const saveLoyaltyTier = async (tierData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/loyalty-tiers', { // New endpoint
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tierData) // tierData is a single tier object
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            // After successful save, refresh the local store's loyaltyTiers or update the specific item
            await fetchLoyaltyTiers(); // Simplest way to ensure data consistency
            return await response.json(); // Return the saved/updated tier data
        } catch (error) {
            console.error('Failed to save loyalty tier', error);
            throw error; // Re-throw for the component to handle
        }
    };

    return {        
        paymentTypes,
        taxTypes,
        fetchPaymentTypes,
        createPaymentType,
        alterPaymentTypeVisibility,
        alterPaymentTypeDescription,
        fetchTaxTypes,
        createTaxType,
        alterTaxTypeVisibility,
        alterTaxTypeDescription,
        getCompanyStampImageUrl,
        uploadCompanyStamp,
        loyaltyTiers,
        fetchLoyaltyTiers,
        saveLoyaltyTier
    };
}

const fetchLoyaltyTiers = async () => {
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch('/api/settings/loyalty-tiers', { // New endpoint
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        loyaltyTiers.value = await response.json();
    } catch (error) {
        console.error('Failed to fetch loyalty tiers', error);
        loyaltyTiers.value = []; // Reset or handle error appropriately
        // Optionally re-throw or show a toast
    }
};

const saveLoyaltyTier = async (tierData) => {
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch('/api/settings/loyalty-tiers', { // New endpoint
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tierData) // tierData is a single tier object
        });
        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        // After successful save, refresh the local store's loyaltyTiers or update the specific item
        await fetchLoyaltyTiers(); // Simplest way to ensure data consistency
        return await response.json(); // Return the saved/updated tier data
    } catch (error) {
        console.error('Failed to save loyalty tier', error);
        throw error; // Re-throw for the component to handle
    }
};
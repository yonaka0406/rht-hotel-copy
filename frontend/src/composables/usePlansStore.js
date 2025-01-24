import { ref, watch } from 'vue';

const plans = ref([]);
const addons = ref([]);

export function usePlansStore() {

    const fetchPlansForHotel = async (hotel_id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/all/${hotel_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            plans.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch hotel plans', error);
        }
    };

    const fetchPlanAddons = async (gid, hid, hotel_id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/${gid}/${hid}/${hotel_id}/addons`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            addons.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch plan addons', error);
        }
    };    

    return {
        plans,      
        addons,  
        fetchPlansForHotel, 
        fetchPlanAddons,       
    };
}
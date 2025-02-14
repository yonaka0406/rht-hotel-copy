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
            plans.value = plans.value.map(plan => ({
                ...plan,
                plan_key: 
                  (plan.plans_global_id ?? '') + 'h' + (plan.plans_hotel_id ?? '')
              }));
            console.log('Fetch plans from Store:',plans.value);
            
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
            console.log('From Store => fetchPlanAddons:', addons.value);
            
        } catch (error) {
            console.error('Failed to fetch plan addons', error);
        }
    };

    const fetchPlanRate = async (gid, hid, hotel_id, date) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plan/rate/${gid}/${hid}/${hotel_id}/${date}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            const rate = await response.json();
            console.log('From Store => fetchPlanRate:', rate);
            return rate;
            
        } catch (error) {
            console.error('Failed to fetch plan rate', error);
        }
    };

    return {
        plans,      
        addons,  
        fetchPlansForHotel, 
        fetchPlanAddons,
        fetchPlanRate,
    };
}
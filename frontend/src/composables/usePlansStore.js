import { ref, watch } from 'vue';

const plans = ref([]);
const addons = ref([]);
const patterns = ref([]);

export function usePlansStore() {

    // Plans
    const fetchPlansGlobal = async () => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/global`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            plans.value = await response.json();
            plans.value = plans.value.map(plan => ({
                ...plan,
                plan_key: (plan.id ?? '') + 'h'
            }));
        } catch (error) {
            console.error('Failed to fetch global plans', error);
        }
    };
    const fetchPlansHotel = async () => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/hotel`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            plans.value = await response.json();
            plans.value = plans.value.map(plan => ({
                ...plan,
                plan_key: (plan.plans_global_id ?? '') + 'h' + (plan.id ?? '')
            }));
        } catch (error) {
            console.error('Failed to fetch global plans', error);
        }
    };
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
            // console.log('Fetch plans from Store:',plans.value);
            
        } catch (error) {
            console.error('Failed to fetch hotel plans', error);
        }
    };
    const createGlobalPlan = async (data) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/plans/global', {
                method: 'POST',
                headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to fetch hotel plans', error);
        }
    };
    const updateGlobalPlan = async (id, data) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/global/${id}`, {
                method: 'PUT',
                headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to fetch hotel plans', error);
        }
    };
    const createHotelPlan = async (data) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/plans/hotel', {
                method: 'POST',
                headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to fetch hotel plans', error);
        }
    };
    const updateHotelPlan = async (id, data) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/hotel/${id}`, {
                method: 'PUT',
                headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to fetch hotel plans', error);
        }
    };

    // Addons
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
            // console.log('From Store => fetchPlanAddons:', addons.value);
            
        } catch (error) {
            console.error('Failed to fetch plan addons', error);
        }
    };
    const fetchAllAddons = async (hotel_id) => {
        try {
            const authToken = localStorage.getItem('authToken')
            const response = await fetch(`/api/addons/all/${hotel_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            return data
            
        } catch (err) {
            console.error('Error fetching global addons:', err)
            err.value = err.message || 'Failed to fetch global addons'
        } finally {
        }
    };

    // Rates
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
            // console.log('From Store => fetchPlanRate:', rate);
            return rate;
            
        } catch (error) {
            console.error('Failed to fetch plan rate', error);
        }
    };
    const fetchPlanRates = async (gid, hid, hotel_id, date) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plan/rate-detail/${gid}/${hid}/${hotel_id}/${date}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            const rate = await response.json();            
            return rate;
            
        } catch (error) {
            console.error('Failed to fetch plan rates', error);
        }
    };

    // Patterns
    const fetchGlobalPatterns = async () => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/patterns/global`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            patterns.value = await response.json();            
        } catch (error) {
            console.error('Failed to fetch global patterns', error);
        }
    };
    const fetchHotelPatterns = async () => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/patterns/hotel`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            patterns.value = await response.json();            
        } catch (error) {
            console.error('Failed to fetch hotel patterns', error);
        }
    };
    const fetchPatternsForHotel = async (hotel_id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/patterns/all/${hotel_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            patterns.value = await response.json();             
            
        } catch (error) {
            console.error('Failed to fetch hotel patterns', error);
        }
    };
    const createPlanPattern = async (data) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/plans/patterns', {
                method: 'POST',
                headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to create plan pattern', error);
        }
    };
    const updatePlanPattern = async (id, data) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/patterns/${id}`, {
                method: 'PUT',
                headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to update plan pattern', error);
        }
    };

    return {
        plans,
        addons,
        patterns,
        fetchPlansGlobal,
        fetchPlansHotel,
        fetchPlansForHotel,
        createGlobalPlan,
        updateGlobalPlan,
        createHotelPlan,
        updateHotelPlan,
        fetchPlanAddons,
        fetchAllAddons,
        fetchPlanRate,
        fetchPlanRates,
        fetchGlobalPatterns,
        fetchHotelPatterns,
        fetchPatternsForHotel,
        createPlanPattern,
        updatePlanPattern,
    };
}
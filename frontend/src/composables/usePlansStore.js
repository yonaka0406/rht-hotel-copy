import { ref } from 'vue';

const plans = ref([]);
const hotelPlans = ref([]);
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
    const fetchPlansForHotel = async (hotel_id, targetDate = null, dateEnd = null, includeInactive = false) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/plans/all/${hotel_id}`;
            const queryParams = new URLSearchParams();
            
            if (targetDate) {
                queryParams.append('target_date', targetDate);
            }
            if (dateEnd) {
                queryParams.append('date_end', dateEnd);
            }
            if (includeInactive) {
                queryParams.append('include_inactive', 'true');
            }
            
            const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            plans.value = data;
            return plans.value;
        } catch (error) {
            console.error('Failed to fetch hotel plans', error);
            return [];
        }
    };
    const fetchHotelPlans = async (hotel_id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/hotel/${hotel_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            hotelPlans.value = data;
            return hotelPlans.value;
        } catch (error) {
            console.error('Failed to fetch hotel plans', error);
            return [];
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

    // Plan Type Categories
    const fetchPlanTypeCategories = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/plans/categories/type', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to fetch plan type categories', error);
            throw error;
        }
    };
    const createPlanTypeCategory = async (data) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/plans/categories/type', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to create plan type category', error);
            throw error;
        }
    };
    const updatePlanTypeCategory = async (id, data) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/categories/type/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to update plan type category', error);
            throw error;
        }
    };
    // Plan Package Categories
    const fetchPlanPackageCategories = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/plans/categories/package', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to fetch plan package categories', error);
            throw error;
        }
    };
    const createPlanPackageCategory = async (data) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/plans/categories/package', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to create plan package category', error);
            throw error;
        }
    };
    const updatePlanPackageCategory = async (id, data) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/categories/package/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to update plan package category', error);
            throw error;
        }
    };

    // Delete Plan Type Category
    const deletePlanTypeCategory = async (id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/categories/type/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to delete plan type category', error);
            throw error;
        }
    };

    // Delete Plan Package Category
    const deletePlanPackageCategory = async (id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/categories/package/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to delete plan package category', error);
            throw error;
        }
    };
    // Plan Display Order
    const updatePlansOrderBulk = async (hotelId, plans) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/reorder/hotel/${hotelId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(plans), // Send the entire array
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to update plan display order', error);
            throw error;
        }
    };

    // Plan Copy Between Hotels
    const copyPlanToHotel = async (sourcePlanId, sourceHotelId, targetHotelId, options) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/plans/copy', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sourcePlanId, sourceHotelId, targetHotelId, options }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to copy plan to hotel', error);
            throw error;
        }
    };

    const bulkCopyPlansToHotel = async (sourcePlanIds, sourceHotelId, targetHotelId, options) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/plans/bulk-copy', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sourcePlanIds, sourceHotelId, targetHotelId, options }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to bulk copy plans to hotel', error);
            throw error;
        }
    };

    // Check if a hotel plan can be deleted
    const checkHotelPlanDeletion = async (planHotelId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/hotel/${planHotelId}/check`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to check hotel plan deletion', error);
            throw error;
        }
    };

    // Delete a hotel plan
    const deleteHotelPlan = async (planHotelId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/hotel/${planHotelId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to delete hotel plan', error);
            throw error;
        }
    };

    // Check if a global plan can be deleted
    const checkGlobalPlanDeletion = async (planGlobalId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/global/${planGlobalId}/check`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to check global plan deletion', error);
            throw error;
        }
    };

    // Delete a global plan
    const deleteGlobalPlan = async (planGlobalId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/global/${planGlobalId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to delete global plan', error);
            throw error;
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

    const deletePlanPattern = async (id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/patterns/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to delete plan pattern', error);
            throw error;
        }
    };

    return {
        plans,
        hotelPlans,
        addons,
        patterns,
        fetchPlansGlobal,
        fetchPlansHotel,
        fetchPlansForHotel,
        fetchHotelPlans,
        createGlobalPlan,
        updateGlobalPlan,
        createHotelPlan,
        updateHotelPlan,
        fetchPlanTypeCategories,
        createPlanTypeCategory,
        updatePlanTypeCategory,
        deletePlanTypeCategory,
        fetchPlanPackageCategories,
        createPlanPackageCategory,
        updatePlanPackageCategory,
        deletePlanPackageCategory,
        updatePlansOrderBulk,
        copyPlanToHotel,
        bulkCopyPlansToHotel,
        checkHotelPlanDeletion,
        deleteHotelPlan,
        checkGlobalPlanDeletion,
        deleteGlobalPlan,
        fetchPlanAddons,
        fetchAllAddons,
        fetchPlanRate,
        fetchPlanRates,
        fetchGlobalPatterns,
        fetchHotelPatterns,
        fetchPatternsForHotel,
        createPlanPattern,
        updatePlanPattern,
        deletePlanPattern,
    };
}
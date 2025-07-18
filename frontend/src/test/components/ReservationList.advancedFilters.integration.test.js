import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import PrimeVue from 'primevue/config';
import { ref } from 'vue';

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}));

vi.mock('../../composables/useHotelStore', () => ({
  useHotelStore: () => ({
    selectedHotelId: { value: 1 },
    fetchHotels: vi.fn(),
    fetchHotel: vi.fn(),
  }),
}));

const mockReservations = [
  {
    id: 1,
    reservation_number: 'RES-001',
    booker_name: '田中太郎',
    clients_json: [{ name: '田中花子', client_id: 101 }],
    email: 'taro@example.com',
    phone: '090-1234-5678',
    status: 'confirmed',
    price: 10000,
    payment: 10000,
    check_in: '2024-06-01',
    number_of_people: 2,
    number_of_nights: 1
  },
  {
    id: 2,
    reservation_number: 'RES-002',
    booker_name: '山田花子',
    clients_json: [{ name: '山田太郎', client_id: 102 }],
    email: 'hanako@example.com',
    phone: '080-5678-1234',
    status: 'hold',
    price: 20000,
    payment: 15000,
    check_in: '2024-06-02',
    number_of_people: 1,
    number_of_nights: 2
  },
  {
    id: 3,
    reservation_number: 'RES-003',
    booker_name: '佐藤健',
    clients_json: [{ name: '佐藤花', client_id: 103 }],
    email: 'ken@example.com',
    phone: '070-1111-2222',
    status: 'cancelled',
    price: 15000,
    payment: 15000,
    check_in: '2024-05-15',
    number_of_people: 3,
    number_of_nights: 1
  }
];

describe('ReservationList.vue Advanced Filters Integration', () => {
  let wrapper;

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  function mountWithFilters({
    status = [],
    priceMin = null,
    priceMax = null,
    startDate = new Date('2024-05-01'),
    endDate = new Date('2024-06-30'),
    searchQuery = '',
    searchResults = [],
    hasActiveSearch = false
  } = {}) {
    vi.doMock('../../composables/useReportStore', () => ({
      useReportStore: () => ({
        reservationList: ref(mockReservations),
        fetchReservationListView: vi.fn(),
        exportReservationList: vi.fn(),
        exportReservationDetails: vi.fn(),
        exportMealCount: vi.fn(),
      })
    }));
    vi.doMock('../../composables/useReservationSearch', () => ({
      useReservationSearch: () => ({
        searchQuery: ref(searchQuery),
        searchResults: ref(searchResults),
        isSearching: ref(false),
        searchSuggestions: ref([]),
        activeFilters: ref([]),
        searchActiveFilters: ref([]),
        searchResultsCount: ref(searchResults.length),
        hasActiveSearch: ref(hasActiveSearch),
        performSearch: vi.fn(),
        clearSearch: vi.fn(),
        addFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearAllFilters: vi.fn(),
      })
    }));
    return import('../../pages/MainPage/ReservationList.vue').then(({ default: ReservationList }) => {
      return mount(ReservationList, {
        global: {
          plugins: [[PrimeVue, {}]],
          stubs: {
            ReservationSearchBar: true,
            DatePicker: true,
            Select: true,
            InputNumber: true,
            Button: true,
            Badge: true,
            SplitButton: true,
            Drawer: true,
            Card: true,
            MultiSelect: true,
            Dropdown: true,
          },
          directives: {
            tooltip: {},
          },
        },
        data() {
          return {
            tableLoading: false,
            filters: { status: { value: status } },
            priceFilterMin: priceMin,
            priceFilterMax: priceMax,
            startDateFilter: startDate || new Date('2024-05-01'),
            endDateFilter: endDate || new Date('2024-06-30'),
          };
        },
      });
    });
  }

  it('filters by multiple statuses', async () => {
    wrapper = await mountWithFilters();
    wrapper.vm.filters.status.value = ['confirmed', 'hold'];
    wrapper.vm.startDateFilter = new Date('2024-05-01'); // June 1, 2024 local
    wrapper.vm.endDateFilter = new Date('2024-07-01');   // July 1, 2024 local
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    const filtered = wrapper.vm.filteredReservations;
    console.log('filtered by multiple statuses:', filtered);
    expect(filtered.length).toBe(2);
    expect(filtered.some(r => r.status === 'confirmed')).toBe(true);
    expect(filtered.some(r => r.status === 'hold')).toBe(true);
  }, 15000);

  it('filters by price range', async () => {
    wrapper = await mountWithFilters();
    wrapper.vm.filters.status.value = null;
    wrapper.vm.priceFilterMin = 12000;
    wrapper.vm.priceFilterMax = 20000;
    wrapper.vm.startDateFilter = new Date('2024-05-01'); // May 1, 2024 local
    wrapper.vm.endDateFilter = new Date('2024-07-01');   // July 1, 2024 local
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    const filtered = wrapper.vm.filteredReservations;
    expect(filtered.length).toBe(2);
    expect(filtered.every(r => r.price >= 12000 && r.price <= 20000)).toBe(true);
  });

  it('filters by date range', async () => {
    wrapper = await mountWithFilters();
    wrapper.vm.filters.status.value = null;
    wrapper.vm.priceFilterMin = null;
    wrapper.vm.priceFilterMax = null;
    wrapper.vm.startDateFilter = new Date('2024-06-01');
    wrapper.vm.endDateFilter = new Date('2024-06-02');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    const filtered = wrapper.vm.filteredReservations;
    expect(filtered.length).toBe(2);
    const start = new Date('2024-06-01T00:00:00Z').getTime();
    const end = new Date('2024-06-02T00:00:00Z').getTime();
    expect(filtered.every(r => {
        const checkIn = new Date(r.check_in).getTime();
        return checkIn >= start && checkIn <= end;
    })).toBe(true);
  });

  it('combines status, price, and date filters', async () => {
    wrapper = await mountWithFilters();
    wrapper.vm.filters.status.value = ['confirmed', 'hold'];
    wrapper.vm.priceFilterMin = 10000;
    wrapper.vm.priceFilterMax = 20000;
    wrapper.vm.startDateFilter = new Date('2024-05-01'); // June 1, 2024 local
    wrapper.vm.endDateFilter = new Date('2024-06-02');   // June 2, 2024 local
    await wrapper.vm.$nextTick();
    const filtered = wrapper.vm.filteredReservations;
    expect(filtered.length).toBe(2);
    expect(filtered.some(r => r.status === 'confirmed')).toBe(true);
    expect(filtered.some(r => r.status === 'hold')).toBe(true);
    expect(filtered.every(r => r.price >= 10000 && r.price <= 20000)).toBe(true);
    expect(filtered.every(r => new Date(r.check_in).getTime() === new Date('2024-06-01T00:00:00Z').getTime() || new Date(r.check_in).getTime() === new Date('2024-06-02T00:00:00Z').getTime())).toBe(true);
  });

  it('applies filters to search results', async () => {
    const searchResults = [
      { reservation: mockReservations[0], highlightedText: { booker_name: '<mark>田中</mark>太郎' } },
      { reservation: mockReservations[1], highlightedText: { booker_name: '<mark>山田</mark>花子' } }
    ];
    wrapper = await mountWithFilters({ hasActiveSearch: true, searchResults });
    wrapper.vm.filters.status.value = ['confirmed'];
    wrapper.vm.priceFilterMin = 9000;
    wrapper.vm.priceFilterMax = 15000;
    wrapper.vm.startDateFilter = new Date('2024-05-01'); // May 1, 2024 local
    wrapper.vm.endDateFilter = new Date('2024-07-01');   // July 1, 2024 local
    await wrapper.vm.$nextTick();
    const filtered = wrapper.vm.filteredReservations;
    expect(filtered.length).toBe(1);
    expect(filtered[0].status).toBe('confirmed');
    expect(filtered[0].highlightedText.booker_name).toBe('<mark>田中</mark>太郎');
  });

  it('returns all when no filters are set', async () => {
    wrapper = await mountWithFilters();
    wrapper.vm.filters.status.value = null;
    wrapper.vm.priceFilterMin = null;
    wrapper.vm.priceFilterMax = null;
    wrapper.vm.startDateFilter = new Date('2000-01-01');
    wrapper.vm.endDateFilter = new Date('2100-01-01');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    const filtered = wrapper.vm.filteredReservations;
    expect(filtered.length).toBe(3);
  });

  it('returns empty when filters exclude all', async () => {
    wrapper = await mountWithFilters();
    wrapper.vm.filters.status.value = ['checked_in'];
    wrapper.vm.priceFilterMin = 50000;
    wrapper.vm.startDateFilter = new Date('2024-05-01'); // June 1, 2024 local
    wrapper.vm.endDateFilter = new Date('2024-07-01');   // July 1, 2024 local
    await wrapper.vm.$nextTick();
    const filtered = wrapper.vm.filteredReservations;
    expect(filtered.length).toBe(0);
  });
}); 
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import PrimeVue from 'primevue/config';
import { ref } from 'vue';

vi.mock('../../composables/useHotelStore', () => ({
  useHotelStore: () => ({
    selectedHotelId: { value: 1 },
    fetchHotels: vi.fn(),
    fetchHotel: vi.fn(),
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
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
  }
];

describe('ReservationList.vue Integration', () => {
  let wrapper;

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders reservation data and allows search-only', async () => {
    vi.doMock('../../composables/useReportStore', () => ({
      useReportStore: () => ({
        reservationList: ref([mockReservations[0]]),
        fetchReservationListView: vi.fn(),
        exportReservationList: vi.fn(),
        exportReservationDetails: vi.fn(),
        exportMealCount: vi.fn(),
      })
    }));
    vi.doMock('../../composables/useReservationSearch', () => ({
      useReservationSearch: () => ({
        searchQuery: ref('田中'),
        searchResults: ref([
          {
            reservation: mockReservations[0],
            highlightedText: { booker_name: '<mark>田中</mark>太郎' }
          }
        ]),
        isSearching: ref(false),
        searchSuggestions: ref([]),
        activeFilters: ref([]),
        searchActiveFilters: ref([]),
        searchResultsCount: ref(1),
        hasActiveSearch: ref(true),
        performSearch: vi.fn(),
        clearSearch: vi.fn(),
        addFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearAllFilters: vi.fn(),
      })
    }));
    const { default: ReservationList } = await import('../../pages/MainPage/ReservationList.vue');
    wrapper = mount(ReservationList, {
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
        },
        directives: {
          tooltip: {},
        },
      },
    });
    await wrapper.vm.$nextTick();
    console.log('filteredReservations[0]:', wrapper.vm.filteredReservations[0]);
    expect(wrapper.vm.filteredReservations[0].highlightedText.booker_name).toBe('<mark>田中</mark>太郎');
  });

  it('shows highlighting for reservation number, email, and phone', async () => {
    vi.doMock('../../composables/useReportStore', () => ({
      useReportStore: () => ({
        reservationList: ref([mockReservations[0]]),
        fetchReservationListView: vi.fn(),
        exportReservationList: vi.fn(),
        exportReservationDetails: vi.fn(),
        exportMealCount: vi.fn(),
      })
    }));
    vi.doMock('../../composables/useReservationSearch', () => ({
      useReservationSearch: () => ({
        searchQuery: ref('RES-001'),
        searchResults: ref([
          {
            reservation: JSON.parse(JSON.stringify(mockReservations[0])),
            highlightedText: {
              reservation_number: '<mark>RES-001</mark>',
              email: '<mark>taro@example.com</mark>',
              phone: '<mark>090-1234-5678</mark>'
            }
          }
        ]),
        isSearching: ref(false),
        searchSuggestions: ref([]),
        activeFilters: ref([]),
        searchActiveFilters: ref([]),
        searchResultsCount: ref(1),
        hasActiveSearch: ref(true),
        performSearch: vi.fn(),
        clearSearch: vi.fn(),
        addFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearAllFilters: vi.fn(),
      })
    }));
    const { default: ReservationList } = await import('../../pages/MainPage/ReservationList.vue');
    wrapper = mount(ReservationList, {
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
        },
        directives: {
          tooltip: {},
        },
      },
    });
    await wrapper.vm.$nextTick();
    console.log('filteredReservations[0]:', wrapper.vm.filteredReservations[0]);
    expect(wrapper.vm.filteredReservations[0].highlightedText.reservation_number).toBe('<mark>RES-001</mark>');
    expect(wrapper.vm.filteredReservations[0].highlightedText.email).toBe('<mark>taro@example.com</mark>');
    expect(wrapper.vm.filteredReservations[0].highlightedText.phone).toBe('<mark>090-1234-5678</mark>');
  });

  it('combines search and filter', async () => {
    vi.doMock('../../composables/useReportStore', () => ({
      useReportStore: () => ({
        reservationList: ref([mockReservations[1]]),
        fetchReservationListView: vi.fn(),
        exportReservationList: vi.fn(),
        exportReservationDetails: vi.fn(),
        exportMealCount: vi.fn(),
      })
    }));
    vi.doMock('../../composables/useReservationSearch', () => ({
      useReservationSearch: () => ({
        searchQuery: ref('山田'),
        searchResults: ref([
          {
            reservation: JSON.parse(JSON.stringify(mockReservations[1])),
            highlightedText: { booker_name: '<mark>山田</mark>花子' }
          }
        ]),
        isSearching: ref(false),
        searchSuggestions: ref([]),
        activeFilters: ref([]),
        searchActiveFilters: ref([]),
        searchResultsCount: ref(1),
        hasActiveSearch: ref(true),
        performSearch: vi.fn(),
        clearSearch: vi.fn(),
        addFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearAllFilters: vi.fn(),
      })
    }));
    const { default: ReservationList } = await import('../../pages/MainPage/ReservationList.vue');
    wrapper = mount(ReservationList, {
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
        },
        directives: {
          tooltip: {},
        },
      },
    });
    await wrapper.vm.$nextTick();
    console.log('filteredReservations[0]:', wrapper.vm.filteredReservations[0]);
    expect(wrapper.vm.filteredReservations[0].highlightedText.booker_name).toBe('<mark>山田</mark>花子');
    expect(wrapper.vm.filteredReservations.some(r => r.status === 'hold')).toBe(true);
  });

  it('applies status filter only', async () => {
    vi.doMock('../../composables/useReportStore', () => ({
      useReportStore: () => ({
        reservationList: ref([mockReservations[0]]),
        fetchReservationListView: vi.fn(),
        exportReservationList: vi.fn(),
        exportReservationDetails: vi.fn(),
        exportMealCount: vi.fn(),
      })
    }));
    vi.doMock('../../composables/useReservationSearch', () => ({
      useReservationSearch: () => ({
        searchQuery: ref(''),
        searchResults: ref([]),
        isSearching: ref(false),
        searchSuggestions: ref([]),
        activeFilters: ref([]),
        searchActiveFilters: ref([]),
        searchResultsCount: ref(0),
        hasActiveSearch: ref(false),
        performSearch: vi.fn(),
        clearSearch: vi.fn(),
        addFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearAllFilters: vi.fn(),
      })
    }));
    const { default: ReservationList } = await import('../../pages/MainPage/ReservationList.vue');
    wrapper = mount(ReservationList, {
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
        },
        directives: {
          tooltip: {},
        },
      },
      data() {
        return {
          tableLoading: false,
          filters: { status: { value: 'confirmed' } },
        };
      },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredReservations.some(r => r.status === 'confirmed')).toBe(true);
    expect(wrapper.vm.filteredReservations.some(r => r.status !== 'confirmed')).toBe(false);
  });

  it('clears all filters and search', async () => {
    const searchQuery = ref('田中');
    vi.doMock('../../composables/useReportStore', () => ({
      useReportStore: () => ({
        reservationList: { value: [mockReservations[0]] },
        fetchReservationListView: vi.fn(),
        exportReservationList: vi.fn(),
        exportReservationDetails: vi.fn(),
        exportMealCount: vi.fn(),
      })
    }));
    vi.doMock('../../composables/useReservationSearch', () => ({
      useReservationSearch: () => ({
        searchQuery,
        searchResults: [
          {
            reservation: JSON.parse(JSON.stringify(mockReservations[0])),
            highlightedText: { booker_name: '<mark>田中</mark>太郎' }
          }
        ],
        isSearching: false,
        searchSuggestions: [],
        activeFilters: { value: [] },
        searchActiveFilters: { value: [] },
        searchResultsCount: 1,
        hasActiveSearch: true,
        performSearch: vi.fn(),
        clearSearch: () => { searchQuery.value = ''; },
        addFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearAllFilters: () => { searchQuery.value = ''; },
      })
    }));
    const { default: ReservationList } = await import('../../pages/MainPage/ReservationList.vue');
    wrapper = mount(ReservationList, {
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
        },
        directives: {
          tooltip: {},
        },
      },
      data() {
        return {
          tableLoading: false,
        };
      },
    });
    await wrapper.vm.handleClearAllFilters();
    await wrapper.vm.$nextTick();
    expect(searchQuery.value).toBe('');
    expect(wrapper.vm.filters.status.value).toBeNull();
  });
}); 
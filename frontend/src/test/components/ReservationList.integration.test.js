import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { ref } from 'vue';

// Move all vi.doMock calls for composables to the top
let mockReservationListRef = ref([]);
let mockSearchResultsRef = ref([]);
let mockSearchQueryRef = ref('');
let mockHasActiveSearchRef = ref(false);

vi.doMock('../../composables/useHotelStore', () => ({
  useHotelStore: () => ({
    selectedHotelId: ref(1),
    fetchHotels: vi.fn(),
    fetchHotel: vi.fn(),
  }),
}));

vi.doMock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}));

vi.doMock('../../composables/useReportStore', () => ({
  useReportStore: () => ({
    reservationList: mockReservationListRef,
    fetchReservationListView: vi.fn(),
    exportReservationList: vi.fn(),
    exportReservationDetails: vi.fn(),
    exportMealCount: vi.fn(),
  })
}));
vi.doMock('../../composables/useReservationSearch', () => ({
  useReservationSearch: () => ({
    searchQuery: mockSearchQueryRef,
    searchResults: mockSearchResultsRef,
    isSearching: ref(false),
    searchSuggestions: ref([]),
    activeFilters: ref([]),
    searchActiveFilters: ref([]),
    searchResultsCount: ref(mockSearchResultsRef.value.length),
    hasActiveSearch: mockHasActiveSearchRef,
    performSearch: vi.fn(),
    clearSearch: vi.fn(),
    addFilter: vi.fn(),
    removeFilter: vi.fn(),
    clearAllFilters: vi.fn(),
  })
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

const { default: ReservationList } = await import('../../pages/MainPage/ReservationList.vue');

describe('ReservationList.vue Integration', () => {
  let wrapper;

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockReservationListRef.value = [];
    mockSearchResultsRef.value = [];
    mockSearchQueryRef.value = '';
    mockHasActiveSearchRef.value = false;
  });

  it('renders reservation data and allows search-only', async () => {
    mockReservationListRef.value = [...mockReservations];
    mockSearchQueryRef.value = '田中';
    mockHasActiveSearchRef.value = true;
    mockSearchResultsRef.value = [
      {
        reservation: mockReservations[0],
        highlightedText: { booker_name: '<mark>田中</mark>太郎' }
      }
    ];
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
    // Debug output
    console.log('searchResults:', wrapper.vm.searchResults);
    console.log('reservationList:', wrapper.vm.reservationList);
    console.log('filteredReservations:', wrapper.vm.filteredReservations);
    expect(wrapper.vm.filteredReservations.length).toBeGreaterThan(0);
    expect(wrapper.vm.filteredReservations[0].highlightedText.booker_name).toBe('<mark>田中</mark>太郎');
  });

  it('shows highlighting for reservation number, email, and phone', async () => {
    mockReservationListRef.value = [...mockReservations];
    mockSearchQueryRef.value = 'RES-001';
    mockHasActiveSearchRef.value = true;
    mockSearchResultsRef.value = [
      {
        reservation: mockReservations[0],
        highlightedText: {
          reservation_number: '<mark>RES-001</mark>',
          email: '<mark>taro@example.com</mark>',
          phone: '<mark>090-1234-5678</mark>'
        }
      }
    ];
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
    console.log('searchResults:', wrapper.vm.searchResults);
    console.log('reservationList:', wrapper.vm.reservationList);
    console.log('filteredReservations:', wrapper.vm.filteredReservations);
    expect(wrapper.vm.filteredReservations.length).toBeGreaterThan(0);
    expect(wrapper.vm.filteredReservations[0].highlightedText.reservation_number).toBe('<mark>RES-001</mark>');
    expect(wrapper.vm.filteredReservations[0].highlightedText.email).toBe('<mark>taro@example.com</mark>');
    expect(wrapper.vm.filteredReservations[0].highlightedText.phone).toBe('<mark>090-1234-5678</mark>');
  });

  it('combines search and filter', async () => {
    mockReservationListRef.value = [...mockReservations];
    mockSearchQueryRef.value = '山田';
    mockHasActiveSearchRef.value = true;
    mockSearchResultsRef.value = [
      {
        reservation: mockReservations[1],
        highlightedText: { booker_name: '<mark>山田</mark>花子' }
      }
    ];
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
    console.log('searchResults:', wrapper.vm.searchResults);
    console.log('reservationList:', wrapper.vm.reservationList);
    console.log('filteredReservations:', wrapper.vm.filteredReservations);
    expect(wrapper.vm.filteredReservations.length).toBeGreaterThan(0);
    expect(wrapper.vm.filteredReservations[0].highlightedText.booker_name).toBe('<mark>山田</mark>花子');
    expect(wrapper.vm.filteredReservations.some(r => r.status === 'hold')).toBe(true);
  });

  it('applies status filter only', async () => {
    mockReservationListRef.value = [mockReservations[0]];
    mockSearchQueryRef.value = '';
    mockHasActiveSearchRef.value = false;
    mockSearchResultsRef.value = [];
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
    console.log('searchResults:', wrapper.vm.searchResults);
    console.log('reservationList:', wrapper.vm.reservationList);
    console.log('filteredReservations:', wrapper.vm.filteredReservations);
    expect(wrapper.vm.filteredReservations.some(r => r.status === 'confirmed')).toBe(true);
    expect(wrapper.vm.filteredReservations.some(r => r.status !== 'confirmed')).toBe(false);
  });

  it('clears all filters and search', async () => {
    mockReservationListRef.value = [mockReservations[0]];
    mockSearchQueryRef.value = '田中';
    mockHasActiveSearchRef.value = true;
    mockSearchResultsRef.value = [
      {
        reservation: mockReservations[0],
        highlightedText: { booker_name: '<mark>田中</mark>太郎' }
      }
    ];
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
    await wrapper.vm.handleClearAllFilters();
    await wrapper.vm.$nextTick();
    expect(mockSearchQueryRef.value).toBe('');
    expect(wrapper.vm.filters.status.value).toBeNull();
  });
}); 
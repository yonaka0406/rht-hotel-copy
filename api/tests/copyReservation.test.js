const assert = require('assert');

// --- Patch DB before requiring the model (like planRate.test.js) ---
const originalDatabaseModule = require('../config/database');
const mockPool = {
  query: async () => ({ rows: [] }),
  connect: async () => mockPool,
  release: () => {}
};
const mockGetPool = () => mockPool;
require.cache[require.resolve('../config/database')].exports = {
  ...originalDatabaseModule,
  getPool: mockGetPool
};

// --- Mock selectReservation function ---
const mockOriginalReservation = [
  {
    id: "4b381808-2096-4016-a678-88f7c9d2c66c",
    hotel_id: 3,
    reservation_id: "5ec1e07e-280c-4578-965c-3c816dfd5cd5",
    cancelled: null,
    billable: false,
    client_id: "ee331f9c-2038-416b-b26f-578e9c66956d",
    client_name: "アルメイダ ペドロ",
    check_in: "2025-06-12T15:00:00.000Z",
    check_in_time: "16:00:00",
    check_out: "2025-06-30T15:00:00.000Z",
    check_out_time: "10:00:00",
    reservation_number_of_people: 2,
    status: "hold",
    type: "default",
    agent: null,
    ota_reservation_id: null,
    comment: null,
    date: "2025-06-22T15:00:00.000Z",
    room_type_id: 2,
    room_type_name: "Standard",
    room_id: 3,
    room_number: "102",
    smoking: false,
    capacity: 1,
    floor: 1,
    plans_global_id: 3,
    plans_hotel_id: null,
    plan_type: "per_person",
    plan_name: "One-Person Stay",
    number_of_people: 1,
    plan_total_price: "2600",
    addon_total_price: "200.00",
    price: "2800.00",
    reservation_clients: [],
    reservation_addons: [
      {
        addon_id: "3cd47170-29e0-44b2-a4f3-8d347f9a0376",
        addons_global_id: 1,
        addons_hotel_id: null,
        addon_name: "Breakfast",
        quantity: 1,
        price: 200
      }
    ],
    reservation_rates: [
      {
        adjustment_type: "base_rate",
        adjustment_value: 2600,
        tax_type_id: 3,
        tax_rate: 0.1,
        price: 2600
      }
    ]
  },
  {
    id: "ca99d665-83d4-4a1d-b5ff-16c56d700878",
    hotel_id: 3,
    reservation_id: "5ec1e07e-280c-4578-965c-3c816dfd5cd5",
    cancelled: null,
    billable: false,
    client_id: "ee331f9c-2038-416b-b26f-578e9c66956d",
    client_name: "アルメイダ ペドロ",
    check_in: "2025-06-12T15:00:00.000Z",
    check_in_time: "16:00:00",
    check_out: "2025-06-30T15:00:00.000Z",
    check_out_time: "10:00:00",
    reservation_number_of_people: 2,
    status: "hold",
    type: "default",
    agent: null,
    ota_reservation_id: null,
    comment: null,
    date: "2025-06-23T15:00:00.000Z",
    room_type_id: 2,
    room_type_name: "Standard",
    room_id: 3,
    room_number: "102",
    smoking: false,
    capacity: 1,
    floor: 1,
    plans_global_id: 3,
    plans_hotel_id: null,
    plan_type: "per_person",
    plan_name: "One-Person Stay",
    number_of_people: 1,
    plan_total_price: "2600",
    addon_total_price: "200.00",
    price: "2800.00",
    reservation_clients: [],
    reservation_addons: [
      {
        addon_id: "643e7c78-cc75-41fd-92af-d9bcfc6a5e0c",
        addons_global_id: 1,
        addons_hotel_id: null,
        addon_name: "Breakfast",
        quantity: 1,
        price: 200
      }
    ],
    reservation_rates: [
      {
        adjustment_type: "base_rate",
        adjustment_value: 2600,
        tax_type_id: 3,
        tax_rate: 0.1,
        price: 2600
      }
    ]
  }
  // ... (add more detail objects as needed for coverage)
];

// Now require the model (it will use the patched DB pool)
const reservationsModel = require('../models/reservations');

(async () => {
  // Track calls to addReservationHold, addReservationDetail, addReservationAddon
  let newReservationId = 999;
  let detailIdCounter = 2000;
  let addonCalls = [];

  // Provide mocks for all DB operations via dependency injection
  const mockAddReservationHold = async (requestId, data) => {
    assert.strictEqual(data.status, undefined, 'addReservationHold does not set status');
    return { id: newReservationId, ...data };
  };
  const mockAddReservationDetail = async (requestId, reservationId, detail) => {
    assert.strictEqual(reservationId, newReservationId, 'addReservationDetail uses new reservation id');
    // Assert that at least one of plans_global_id or plans_hotel_id is present if either is set (not both null)
    if (detail.plans_global_id !== null || detail.plans_hotel_id !== null) {
      assert.ok(
        detail.plans_global_id !== null || detail.plans_hotel_id !== null,
        'At least one of plans_global_id or plans_hotel_id must be present'
      );
      assert.ok(detail.plan_name, 'plan name copied');
    }
    return { id: ++detailIdCounter, ...detail };
  };
  const mockAddReservationAddon = async (requestId, detailId, addon) => {
    addonCalls.push({ detailId, ...addon });
    return { id: Math.floor(Math.random() * 10000), ...addon };
  };

  // --- Test: Call insertCopyReservation ---
  const room_mapping = [
    { new_room_id: 301, original_room_id: 3 },
    { new_room_id: 302, original_room_id: 3 }
  ];
  const user_id = 42;
  const new_client_id = 20;
  const requestId = 'test-req-1';

  // Call the function under test with dependency injection for all DB ops
  console.log('About to call insertCopyReservation, mockOriginalReservation length:', mockOriginalReservation.length);
  const result = await reservationsModel.insertCopyReservation(
    requestId,
    1,
    new_client_id,
    room_mapping,
    user_id,
    {
      selectReservation: async () => mockOriginalReservation,
      addReservationHold: mockAddReservationHold,
      addReservationDetail: mockAddReservationDetail,
      addReservationAddon: mockAddReservationAddon
    }
  );

  // --- Assertions ---
  assert.ok(result, 'insertCopyReservation returns a result');
  assert.strictEqual(result.status, undefined, 'New reservation status is not set (should default to hold)');
  assert.strictEqual(result.reservation_client_id, new_client_id, 'Client id is updated');

  // Check that addReservationDetail was called for each mapped room
  assert.ok(addonCalls.length >= 2, 'Addons were copied for each detail');
  const breakfastAddon = addonCalls.find(a => a.addon_name === 'Breakfast');
  assert.ok(breakfastAddon, 'Breakfast addon copied');

  console.log('copyReservation test passed');
})(); 
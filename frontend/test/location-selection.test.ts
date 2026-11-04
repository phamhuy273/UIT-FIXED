import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLocationOptions, isValidLocationSelection, selectBuilding, selectFloor } from '../src/features/master-data/utils/location-selection.ts';
import type { BuildingOption } from '../src/features/master-data/types/master-data.types.ts';

const room = { id: 101, name: 'A101', floorId: 10, description: null, locationType: 'CLASSROOM' };
const lobby = { id: 102, name: 'Sảnh A', floorId: null, description: null, locationType: 'COMMON_AREA' };
const buildings: BuildingOption[] = [{
  id: 1, name: 'A', description: null,
  floors: [{ id: 10, name: 'Tầng 1', floorNumber: 1, locations: [room] }], locations: [lobby],
}, { id: 2, name: 'B', description: null, floors: [], locations: [] }];

test('changing a building or floor clears dependent IDs', () => {
  assert.deepEqual(selectBuilding(2), { buildingId: 2, floorId: null, locationId: null });
  assert.deepEqual(selectFloor({ buildingId: 1, floorId: 10, locationId: 101 }, null),
    { buildingId: 1, floorId: null, locationId: null });
});

test('floorless areas are valid without inventing a floor ID', () => {
  assert.equal(isValidLocationSelection(buildings, { buildingId: 1, floorId: null, locationId: 102 }), true);
  assert.deepEqual(getLocationOptions(buildings, { buildingId: 1, floorId: null, locationId: null }).locations, [lobby]);
});

test('rejects stale rooms, foreign floors, incomplete and missing buildings', () => {
  for (const value of [
    { buildingId: 2, floorId: 10, locationId: 101 },
    { buildingId: 1, floorId: 99, locationId: 102 },
    { buildingId: 1, floorId: null, locationId: 101 },
    { buildingId: 1, floorId: 10, locationId: null },
    { buildingId: null, floorId: null, locationId: null },
  ]) assert.equal(isValidLocationSelection(buildings, value), false);
  assert.deepEqual(getLocationOptions(buildings, { buildingId: 1, floorId: 99, locationId: 102 }).locations, []);
});

test('validates a room only within its selected floor and building', () => {
  assert.equal(isValidLocationSelection(buildings, { buildingId: 1, floorId: 10, locationId: 101 }), true);
  assert.equal(isValidLocationSelection([], { buildingId: 1, floorId: 10, locationId: 101 }), false);
});

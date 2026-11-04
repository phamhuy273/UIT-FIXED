import type { BuildingOption, LocationSelection } from '../types/master-data.types.ts';

export function selectBuilding(buildingId: number | null): LocationSelection {
  return { buildingId, floorId: null, locationId: null };
}

export function selectFloor(value: LocationSelection, floorId: number | null): LocationSelection {
  return { buildingId: value.buildingId, floorId, locationId: null };
}

export function getLocationOptions(buildings: BuildingOption[], value: LocationSelection) {
  const building = buildings.find(({ id }) => id === value.buildingId);
  const floor = building?.floors.find(({ id }) => id === value.floorId);
  // An unknown floor must never silently fall back to another floor or lobby.
  const locations = value.floorId === null ? (building?.locations ?? []) : (floor?.locations ?? []);
  return { building, floor, locations };
}

export function isValidLocationSelection(buildings: BuildingOption[], value: LocationSelection): boolean {
  const { building, floor, locations } = getLocationOptions(buildings, value);
  return Boolean(building && (value.floorId === null || floor) && locations.some(({ id }) => id === value.locationId));
}

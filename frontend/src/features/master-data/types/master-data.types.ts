export interface LocationOption {
  id: number;
  name: string;
  description: string | null;
  locationType: string | null;
  floorId: number | null;
}

export interface FloorOption {
  id: number;
  name: string;
  floorNumber: number | null;
  locations: LocationOption[];
}

export interface BuildingOption {
  id: number;
  name: string;
  description: string | null;
  floors: FloorOption[];
  locations: LocationOption[];
}

export interface CategoryOption { id: number; name: string; description: string | null; }

export interface LocationSelection {
  buildingId: number | null;
  floorId: number | null;
  locationId: number | null;
}

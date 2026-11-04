export interface PortalRoom {
  id: number;
  code: string;
  name: string;
  capacity: number;
  floor: string | null;
  room_type_code: string;
  place_name: string;
}

export interface PortalCatalog {
  source: string;
  retrievedOn: string;
  groupCounts: Record<string, number>;
  rooms: PortalRoom[];
}

export function isTeachingRoom(room: PortalRoom): boolean {
  return ['Nhà A', 'Nhà B', 'Nhà C', 'Nhà E'].includes(room.place_name)
    && ['LT', 'TH'].includes(room.room_type_code);
}

const buildingNames: Record<string, string> = {
  'Nhà A': 'Tòa A', 'Nhà B': 'Tòa B', 'Nhà C': 'Tòa C', 'Nhà E': 'Tòa E', 'Sân tập': 'Sân tập',
};

export function buildingName(place: string): string {
  const name = buildingNames[place];
  if (!name) throw new Error(`Unknown portal place: ${place}. Review mapping before importing.`);
  return name;
}

export function portalFloor(value: string | null): { name: string; number: number | null } | null {
  const label = value?.trim();
  if (!label) return null;
  // Use the portal's explicit floor field, never infer from a room code.
  const number = /^-?\d+$/.test(label) ? Number(label) : null;
  if (number !== null && !Number.isSafeInteger(number)) throw new Error('Invalid floor number');
  return { name: `Tầng ${label}`, number };
}

export function validateCatalog(value: unknown): asserts value is PortalCatalog {
  if (!value || typeof value !== 'object') throw new Error('Invalid room catalog');
  const catalog = value as PortalCatalog;
  if (catalog.source !== 'https://portal.uit.edu.vn/lich-phong'
    || !/^\d{4}-\d{2}-\d{2}$/.test(catalog.retrievedOn)
    || !Array.isArray(catalog.rooms) || catalog.rooms.length === 0) throw new Error('Invalid room catalog metadata');
  const ids = new Set<number>();
  const codes = new Set<string>();
  const places = new Set<string>();
  for (const room of catalog.rooms) {
    if (!room || !Number.isSafeInteger(room.id) || room.id <= 0
      || typeof room.code !== 'string' || !room.code.trim()
      || typeof room.name !== 'string' || !room.name.trim()
      || typeof room.place_name !== 'string'
      || typeof room.room_type_code !== 'string' || !room.room_type_code
      || (room.floor !== null && typeof room.floor !== 'string')
      || !Number.isInteger(room.capacity) || room.capacity < 0) throw new Error('Invalid portal room');
    const codeKey = `${room.place_name}:${room.code}`;
    if (ids.has(room.id) || codes.has(codeKey)) throw new Error(`Duplicate portal room: ${room.code}`);
    ids.add(room.id); codes.add(codeKey); places.add(room.place_name);
    buildingName(room.place_name); portalFloor(room.floor);
  }
  for (const place of Object.keys(buildingNames)) {
    if (!places.has(place)) throw new Error(`Missing portal place: ${place}`);
  }
}

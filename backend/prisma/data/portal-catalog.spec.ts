import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildingName, isTeachingRoom, portalFloor, validateCatalog } from './portal-catalog.ts';

const snapshot = JSON.parse(readFileSync(new URL('./uit-rooms.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));

describe('UIT portal room catalog', () => {
  it('includes theory/lab rooms but excludes meeting rooms, auditoriums and sports areas even when tagged LT', () => {
    const base = snapshot.rooms[0];
    for (const place of ['Nhà A', 'Nhà B', 'Nhà C', 'Nhà E']) {
      expect(isTeachingRoom({ ...base, place_name: place, room_type_code: 'LT' })).toBe(true);
      expect(isTeachingRoom({ ...base, place_name: place, room_type_code: 'TH' })).toBe(true);
      expect(isTeachingRoom({ ...base, place_name: place, room_type_code: 'PH' })).toBe(false);
      expect(isTeachingRoom({ ...base, place_name: place, room_type_code: 'HT' })).toBe(false);
    }
    expect(isTeachingRoom({ ...base, place_name: 'Sân tập', room_type_code: 'LT' })).toBe(false);
  });
  it('accepts the checked-in catalog with unique portal IDs', () => {
    expect(() => validateCatalog(snapshot)).not.toThrow();
    expect(new Set(snapshot.rooms.map((room: { id: number }) => room.id)).size).toBe(snapshot.rooms.length);
    expect(buildingName('Sân tập')).toBe('Sân tập');
  });

  it('rejects duplicated rooms from overlapping meeting-room tabs', () => {
    expect(() => validateCatalog({ ...snapshot, rooms: [...snapshot.rooms, snapshot.rooms[0]] })).toThrow('Duplicate');
  });

  it('refuses unknown places or missing building groups instead of guessing', () => {
    expect(() => buildingName('Nhà Z')).toThrow('Unknown portal place');
    expect(() => validateCatalog({ ...snapshot, rooms: snapshot.rooms.filter((room: { place_name: string }) => room.place_name !== 'Nhà B') })).toThrow('Missing portal place');
  });

  it('keeps explicit source floor metadata rather than deriving it from room codes', () => {
    const room = snapshot.rooms.find((item: { code: string }) => item.code === 'E112');
    expect(portalFloor(room.floor)).toEqual({ name: `Tầng ${room.floor}`, number: Number(room.floor) });
    expect(portalFloor(null)).toBeNull();
    expect(portalFloor('Trệt')).toEqual({ name: 'Tầng Trệt', number: null });
  });
});

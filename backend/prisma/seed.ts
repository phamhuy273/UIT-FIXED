import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { buildingName, isTeachingRoom, portalFloor, validateCatalog } from './data/portal-catalog.ts';

const prisma = new PrismaClient();
const demoDescription = 'Dữ liệu mẫu phục vụ phát triển; cần đối chiếu danh sách phòng chính thức của UIT.';

async function seed() {
  const raw = await readFile(new URL('./data/uit-rooms.json', import.meta.url), 'utf8');
  const catalog: unknown = JSON.parse(raw.replace(/^\uFEFF/, ''));
  validateCatalog(catalog);
  const teachingRooms = catalog.rooms.filter(isTeachingRoom);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(62170402)::text`;
    const legacyBuildings = await tx.building.findMany({
      where: { description: demoDescription }, select: { id: true },
    });
    const importedFloorIds: number[] = [];
    let created = 0;
    let updated = 0;
    let preserved = 0;

    for (const place of [...new Set(teachingRooms.map((room) => room.place_name))]) {
      const name = buildingName(place);
      const description = `Nguồn: ${catalog.source}; nhóm địa điểm: ${place}; cập nhật ${catalog.retrievedOn}.`;
      let building = await tx.building.findFirst({ where: { name }, orderBy: { id: 'asc' } });
      if (!building) building = await tx.building.create({ data: { name, description } });
      else if (building.description === demoDescription) {
        building = await tx.building.update({ where: { id: building.id }, data: { description } });
      }

      for (const room of teachingRooms.filter((item) => item.place_name === place)) {
        const level = portalFloor(room.floor);
        const floor = level ? await tx.floor.upsert({
          where: { buildingId_name: { buildingId: building.id, name: level.name } },
          update: {},
          create: { buildingId: building.id, name: level.name, floorNumber: level.number },
        }) : null;
        if (floor && !importedFloorIds.includes(floor.id)) importedFloorIds.push(floor.id);

        const marker = `[UIT_PORTAL_ROOM_ID:${room.id}]`;
        const description = [
          marker, `Nguồn: ${catalog.source}`, `Ngày lấy danh mục: ${catalog.retrievedOn}`,
          `Mã phòng: ${room.code}`, `Tên trên portal: ${room.name}`,
          `Sức chứa theo portal: ${room.capacity}`, `Tầng theo portal: ${room.floor ?? '(không có)'}`,
          `Loại phòng theo portal: ${room.room_type_code}`,
        ].join('\n');
        const existing = await tx.location.findFirst({
          where: { buildingId: building.id, description: { contains: marker } }, orderBy: { id: 'asc' },
        }) ?? await tx.location.findFirst({
          where: { buildingId: building.id, description: demoDescription, name: `Phòng ${room.code}` },
          orderBy: { id: 'asc' },
        }) ?? await tx.location.findFirst({
          where: { buildingId: building.id, name: room.name }, orderBy: { id: 'asc' },
        });
        const data = { name: room.name, floorId: floor?.id ?? null, locationType: room.room_type_code, description };
        if (!existing) {
          await tx.location.create({ data: { ...data, buildingId: building.id } });
          created++;
        } else if (existing.description === demoDescription || existing.description?.includes(marker)) {
          // Preserve the ID and activation choice; reports may already reference it.
          await tx.location.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          // Do not overwrite a manually maintained record with the same name.
          preserved++;
        }
      }
    }

    // Scope is teaching rooms only, including practical/lab rooms. Retire earlier
    // portal imports of meeting rooms, auditoriums and all sports-area records.
    let retiredOutOfScope = 0;
    for (const room of catalog.rooms.filter((item) => !isTeachingRoom(item))) {
      const retired = await tx.location.updateMany({
        where: { description: { contains: `[UIT_PORTAL_ROOM_ID:${room.id}]` }, isActive: true },
        data: { isActive: false },
      });
      retiredOutOfScope += retired.count;
    }
    const sourceBuildings = await tx.building.findMany({
      where: { description: { contains: catalog.source } }, select: { id: true },
    });
    await tx.floor.updateMany({
      where: {
        buildingId: { in: sourceBuildings.map(({ id }) => id) },
        locations: { none: { isActive: true } },
      },
      data: { isActive: false },
    });
    await tx.building.updateMany({
      where: { name: 'Sân tập', description: { contains: catalog.source } },
      data: { isActive: false },
    });

    // Retire only our old generated samples. Never delete referenced locations.
    const retired = await tx.location.updateMany({
      where: { description: demoDescription, isActive: true }, data: { isActive: false },
    });
    if (legacyBuildings.length) {
      await tx.floor.updateMany({
        where: {
          buildingId: { in: legacyBuildings.map(({ id }) => id) },
          name: { in: ['Tầng 1', 'Tầng 2', 'Tầng 3'] },
          id: { notIn: importedFloorIds },
          locations: { none: { isActive: true } },
        },
        data: { isActive: false },
      });
    }

    const categories = [
      ['Điện / Ổ cắm', 'Đèn, nguồn điện và ổ cắm.'],
      ['Máy chiếu', 'Máy chiếu và kết nối trình chiếu.'],
      ['Máy lạnh / Quạt', 'Thiết bị làm mát và thông gió.'],
      ['Mạng / Wifi', 'Kết nối mạng có dây và không dây.'],
      ['Bàn ghế / Cửa', 'Bàn ghế, cửa và cơ sở vật chất khác.'],
    ];
    // Retire the former category without breaking references from old reports.
    await tx.category.updateMany({
      where: { name: 'Nước / Vệ sinh', isActive: true }, data: { isActive: false },
    });
    for (const [name, description] of categories) {
      if (!await tx.category.findFirst({ where: { name } })) {
        await tx.category.create({ data: { name, description } });
      }
    }

    return { created, updated, preserved, retiredSamples: retired.count, retiredOutOfScope };
  }, { timeout: 60_000 });

  console.log(`Seed từ ${catalog.source} (${catalog.retrievedOn}): ${teachingRooms.length} phòng lý thuyết/thực hành tại A, B, C, E.`);
  console.log(result);
  console.log('Giữ nguyên tầng và loại phòng do portal cung cấp, không suy ra từ mã phòng.');
}

seed()
  .catch((error: unknown) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Sprint 2 staff and department defaults...');

  // 1. Ensure building default departments
  const deptDien = await prisma.department.findFirst({ where: { name: { contains: 'Điện' } } });
  const deptMang = await prisma.department.findFirst({ where: { name: { contains: 'Mạng' } } });

  if (deptDien) {
    await prisma.building.updateMany({
      where: { name: { in: ['Tòa A', 'Tòa B', 'Khu A', 'Khu B'] } },
      data: { defaultDepartmentId: deptDien.id },
    });
    console.log(`Mapped Tòa A, B to Department ${deptDien.id} (${deptDien.name})`);
  }

  if (deptMang) {
    await prisma.building.updateMany({
      where: { name: { in: ['Tòa C', 'Tòa E', 'Khu C', 'Khu E'] } },
      data: { defaultDepartmentId: deptMang.id },
    });
    console.log(`Mapped Tòa C, E to Department ${deptMang.id} (${deptMang.name})`);
  }

  // 2. Hash password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Seed Tech Staff users
  const staffToSeed = [
    {
      email: 'ktv.thietbi@uit.edu.vn',
      fullName: 'Hoàng Văn Thiết Bị',
      departmentId: 1,
    },
    {
      email: 'ktv.nam@uit.edu.vn',
      fullName: 'Nguyễn Văn Thợ',
      departmentId: deptDien?.id ?? 2,
    },
    {
      email: 'ktv.lanh@uit.edu.vn',
      fullName: 'Lê Văn Lạnh',
      departmentId: deptDien?.id ?? 2,
    },
    {
      email: 'ktv.tuan@uit.edu.vn',
      fullName: 'Trần Tuấn Mạng',
      departmentId: deptMang?.id ?? 3,
    },
    {
      email: 'ktv.chieu@uit.edu.vn',
      fullName: 'Phạm Văn Chiếu',
      departmentId: deptMang?.id ?? 3,
    },
  ];

  for (const s of staffToSeed) {
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: s.email,
          fullName: s.fullName,
          password: passwordHash,
          role: Role.TECH_STAFF,
          departmentId: s.departmentId,
          isActive: true,
        },
      });
      console.log(`Created staff: ${s.email} (${s.fullName})`);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: Role.TECH_STAFF,
          departmentId: s.departmentId,
          isActive: true,
          password: passwordHash,
        },
      });
      console.log(`Updated staff: ${s.email} (${s.fullName})`);
    }
  }

  console.log('Sprint 2 staff seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

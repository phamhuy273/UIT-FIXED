import { PrismaService } from '../../../core/database/prisma.service.js';
import { DuplicateService } from './duplicate.service.js';
import { EmbeddingService } from './embedding.service.js';

it('times out safely and keeps the underlying inference bounded until it really finishes', async () => {
  vi.useFakeTimers();
  let release!: (value: number[]) => void;
  const model = { embed: vi.fn(() => new Promise<number[]>((resolve) => { release = resolve; })), modelVersion: 'test' };
  const report = { id: 1, title: 'Máy chiếu lỗi', description: 'Không hoạt động', updatedAt: new Date(), createdAt: new Date(),
    categoryId: 1, studentId: 2, status: 'PENDING', category: { name: 'Máy chiếu' }, location: { name: 'Test' }, incident: null, _count: { confirmations: 0 } };
  const db = { location: { findFirst: vi.fn(async () => ({ id: 1 })) }, category: { findFirst: vi.fn(async () => ({ id: 1 })) },
    incidentReport: { findMany: vi.fn(async () => [report]) },
    reportEmbedding: { findUnique: vi.fn(async () => ({ modelVersion: 'test', contentHash: '', vector: [1] })), upsert: vi.fn() } };
  const service = new DuplicateService(db as unknown as PrismaService, model as unknown as EmbeddingService);
  const input = { locationId: 1, categoryId: 1, title: 'Máy chiếu lỗi', description: 'Không hoạt động' };
  try {
    const pending = service.check(1, input);
    await vi.advanceTimersByTimeAsync(5001);
    expect(await pending).toEqual({ availability: 'unavailable', candidates: [] });
    await expect(service.check(1, input)).rejects.toMatchObject({ status: 429 });
    expect(model.embed).toHaveBeenCalledTimes(1);
    // Let the detached job fail cleanly rather than leaving work hanging.
    release([]);
    await vi.advanceTimersByTimeAsync(1);
    // A second embedding may be needed for a cache miss. Complete it as well.
    release([]);
    await vi.advanceTimersByTimeAsync(1);
  } finally { vi.useRealTimers(); }
});

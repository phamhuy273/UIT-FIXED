import type { PrismaService } from '../../../core/database/prisma.service.js';
import { contentHash, type EmbeddingService, embeddingText } from './embedding.service.js';

export async function reportVector(db: Pick<PrismaService, 'reportEmbedding'>, model: Pick<EmbeddingService, 'embed' | 'modelVersion'>,
  report: { id: number; title: string; description: string }) {
  const text = embeddingText(report.title, report.description);
  const hash = contentHash(text);
  const cached = await db.reportEmbedding.findUnique({ where: { reportId: report.id } });
  if (cached?.modelVersion === model.modelVersion && cached.contentHash === hash) return cached.vector;
  const vector = await model.embed(text);
  await db.reportEmbedding.upsert({ where: { reportId: report.id },
    create: { reportId: report.id, modelVersion: model.modelVersion, contentHash: hash, vector },
    update: { modelVersion: model.modelVersion, contentHash: hash, vector },
  });
  return vector;
}

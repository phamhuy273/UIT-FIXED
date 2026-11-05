import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { EmbeddingService, contentHash, embeddingText } from '../dist/modules/incident-reports/duplicates/embedding.service.js';
const db = new PrismaClient();
const model = new EmbeddingService();
let indexed = 0;
try {
  let cursor;
  while (true) {
    const reports = await db.incidentReport.findMany({ take: 50, orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), where: { status: { in: ['PENDING', 'APPROVED'] } } });
    if (!reports.length) break;
    for (const report of reports) {
      const text = embeddingText(report.title, report.description);
      const hash = contentHash(text);
      const cached = await db.reportEmbedding.findUnique({ where: { reportId: report.id } });
      if (cached?.contentHash === hash && cached.modelVersion === model.modelVersion) continue;
      const vector = await model.embed(text);
      await db.reportEmbedding.upsert({ where: { reportId: report.id },
        create: { reportId: report.id, modelVersion: model.modelVersion, contentHash: hash, vector },
        update: { modelVersion: model.modelVersion, contentHash: hash, vector },
      });
      indexed++;
    }
    cursor = reports.at(-1).id;
  }
  console.log(`Indexed ${indexed} reports locally; text was not sent to an inference API.`);
} finally { await db.$disconnect(); await model.onModuleDestroy(); }

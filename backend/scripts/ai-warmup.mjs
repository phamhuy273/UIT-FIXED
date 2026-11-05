import 'reflect-metadata';
import { EmbeddingService } from '../dist/modules/incident-reports/duplicates/embedding.service.js';
import { cosine } from '../dist/modules/incident-reports/duplicates/duplicate-rules.js';
const model = new EmbeddingService();
try {
  const texts = [
    'Máy chiếu không lên nguồn. Đã cắm điện nhưng không thể bật máy chiếu.',
    'Máy chiếu bật không được. Máy chiếu đã cắm điện nhưng vẫn không khởi động.',
    'Máy chiếu bị mờ. Hình ảnh vẫn hiện nhưng chữ không đọc rõ được.',
    'Máy lạnh chảy nước. Nước nhỏ xuống bàn học khi bật điều hòa.',
  ];
  const vectors = [];
  for (const text of texts) vectors.push(await model.embed(text));
  console.log(JSON.stringify({ model: model.modelVersion, dimensions: vectors[0].length,
    paraphrase: cosine(vectors[0], vectors[1]), differentSymptom: cosine(vectors[0], vectors[2]),
    differentEquipment: cosine(vectors[0], vectors[3]),
    note: 'Smoke examples only, not a calibrated accuracy benchmark.' }, null, 2));
} finally { await model.onModuleDestroy(); }

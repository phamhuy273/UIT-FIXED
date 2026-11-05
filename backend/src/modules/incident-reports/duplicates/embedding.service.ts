import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

export const EMBEDDING_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const EMBEDDING_REVISION = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
export const MODEL_VERSION = `${EMBEDDING_MODEL}@${EMBEDDING_REVISION}:q8`;

export function embeddingText(title: string, description: string) {
  return `${title}. ${description}`.normalize('NFC').replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '[email]')
    .replace(/(?:\+?\d[\s.-]?){9,15}/g, '[phone]').replace(/\s+/g, ' ').trim().slice(0, 3200);
}
export const contentHash = (text: string) => createHash('sha256').update(text).digest('hex');

@Injectable()
export class EmbeddingService implements OnModuleDestroy {
  readonly modelVersion = MODEL_VERSION;
  private extractor?: Promise<FeatureExtractionPipeline>;
  private tail: Promise<unknown> = Promise.resolve();

  private load() {
    this.extractor ??= (async () => {
      const { env, pipeline } = await import('@huggingface/transformers');
      env.cacheDir = path.resolve(process.cwd(), '.cache', 'models');
      // Only model files are fetched. The pipeline runs locally; report text is
      // never an HTTP payload to Hugging Face or another inference provider.
      env.allowRemoteModels = process.env.AI_MODEL_OFFLINE !== 'true';
      return await pipeline('feature-extraction', EMBEDDING_MODEL, {
        revision: EMBEDDING_REVISION, dtype: 'q8', device: 'cpu',
        session_options: { intraOpNumThreads: 2 },
      });
    })().catch((error: unknown) => { this.extractor = undefined; throw error; });
    return this.extractor;
  }

  async embed(text: string): Promise<number[]> {
    // Bound ONNX CPU concurrency; callers cap their candidate set.
    const task = this.tail.then(async () => {
      const extractor = await this.load();
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      const vector = output.tolist()[0] as number[];
      if (vector.length !== 384 || vector.some((item) => !Number.isFinite(item))) throw new Error('Invalid embedding');
      return vector;
    });
    this.tail = task.catch(() => undefined);
    return task;
  }

  async onModuleDestroy() {
    await this.tail;
    if (this.extractor) await (await this.extractor.catch(() => undefined))?.dispose();
  }
}

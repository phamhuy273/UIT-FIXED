import { classifyTime, cosine, observationDate, symptomSummary } from './duplicate-rules.js';
import { contentHash, embeddingText } from './embedding.service.js';

describe('Duplicate occurrence rules', () => {
  const repaired = new Date('2026-01-01T02:00:00Z'); // 09:00 campus time
  it('keeps an unresolved issue eligible regardless of its age', () => {
    expect(classifyTime(null, new Date('2025-01-01'))).toBe('POSSIBLE_DUPLICATE');
  });
  it('recognizes the afternoon failure after a morning repair as recurrence', () => {
    expect(classifyTime(repaired, new Date('2026-01-01T07:00:00Z'))).toBe('POSSIBLE_RECURRENCE');
  });
  it('distinguishes a late report from a new occurrence', () => {
    expect(classifyTime(repaired, new Date('2025-12-31T07:00:00Z'))).toBe('PAST_EVENT');
    expect(classifyTime(repaired, null)).toBe('NEEDS_TIME');
  });
  it('does not invent precise ordering within the same morning', () => {
    const morning = new Date('2025-12-31T17:00:00Z'); // midnight, Jan 1 campus
    expect(classifyTime(repaired, morning)).toBe('NEEDS_TIME');
    expect(classifyTime(repaired, morning, 'BEFORE')).toBe('PAST_EVENT');
    expect(classifyTime(repaired, morning, 'AFTER')).toBe('POSSIBLE_RECURRENCE');
  });
  it('does not let an override contradict a wholly earlier or later half-day', () => {
    expect(classifyTime(repaired, new Date('2026-01-01T05:00:00Z'), 'BEFORE')).toBe('POSSIBLE_RECURRENCE');
    expect(classifyTime(repaired, new Date('2025-12-31T05:00:00Z'), 'AFTER')).toBe('PAST_EVENT');
  });
  it('stores the half-day start in campus time rather than claiming an exact observation', () => {
    expect(observationDate('2026-01-01T10:35:00+07:00')?.toISOString()).toBe('2025-12-31T17:00:00.000Z');
    expect(observationDate('2026-01-01T16:35:00+07:00')?.toISOString()).toBe('2026-01-01T05:00:00.000Z');
  });
  it('rejects future timestamps but preserves unknown times', () => {
    expect(() => observationDate(new Date(Date.now() + 3600_000).toISOString())).toThrow();
    expect(observationDate()).toBeNull();
  });
  it('computes bounded similarity and handles invalid vector shapes', () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([], [])).toBe(0);
    expect(cosine([1], [1, 2])).toBe(0);
  });
  it('redacts contact details without removing negation or Vietnamese accents', () => {
    const text = embeddingText('Máy chiếu không lên nguồn', 'Liên hệ test@gm.uit.edu.vn hoặc 0901234567');
    expect(text).toContain('không lên nguồn');
    expect(text).not.toContain('test@gm.uit.edu.vn');
    expect(text).not.toContain('0901234567');
    expect(contentHash(text)).toBe(contentHash(text));
    expect(contentHash(text + 'x')).not.toBe(contentHash(text));
  });
  it('does not copy arbitrary private content into shared symptoms', () => {
    const result = symptomSummary('Nguyễn Văn A, email@example.com, máy chiếu không lên nguồn');
    expect(result).toBe('Không khởi động / không lên nguồn');
    expect(symptomSummary('Private student information')).not.toContain('Private');
  });
});

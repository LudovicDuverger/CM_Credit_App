import { describe, expect, it } from 'vitest';
import {
  buildTaskDedupeKey,
  extractItems,
  findValueByKeyTokens,
  getCaseIdFromRecord,
  getFirstObjectFromResponse,
  mapTaskLikeObject,
  normalizeSlaStatus,
} from '../lib/data-mappers.ts';

describe('data-mappers unit tests', () => {
  it('normalizes common SLA labels', () => {
    expect(normalizeSlaStatus('At-Risk')).toBe('At Risk');
    expect(normalizeSlaStatus('overdue')).toBe('Breached');
    expect(normalizeSlaStatus('green')).toBe('On Track');
  });

  it('finds a nested value by key tokens', () => {
    const record = {
      context: {
        workflow: {
          businessKey: 'CASE-20260001',
        },
      },
    };

    expect(findValueByKeyTokens(record, ['businesskey'])).toBe('CASE-20260001');
  });

  it('maps task-like objects with fallback stage values', () => {
    const mapped = mapTaskLikeObject(
      {
        title: 'Manual review',
        status: 'InProgress',
        assignedTo: 'agent@bank.test',
        deadline: '2026-04-14T10:00:00Z',
      },
      0,
      { stageName: 'Review', stageId: 'stage-1' },
    );

    expect(mapped.name).toBe('Manual review');
    expect(mapped.stageName).toBe('Review');
    expect(mapped.stageId).toBe('stage-1');
    expect(mapped.dueDate).toBe('2026-04-14T10:00:00Z');
  });

  it('builds dedupe key from id first, then from fallback fields', () => {
    expect(buildTaskDedupeKey({ id: '123', name: 'A' })).toBe('id:123');
    expect(buildTaskDedupeKey({ name: 'Manual Review', stageName: 'Review', dueDate: 'tomorrow' }))
      .toBe('fallback:manualreview:review:tomorrow');
  });

  it('extracts items from array, items wrapper and value wrapper', () => {
    expect(extractItems([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(extractItems({ items: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(extractItems({ value: [{ id: 3 }] })).toEqual([{ id: 3 }]);
  });

  it('returns first object from mixed response shapes', () => {
    expect(getFirstObjectFromResponse({ createdItems: [{ id: 'rec-1' }] })).toEqual({ id: 'rec-1' });
    expect(getFirstObjectFromResponse({ item: { id: 'rec-2' } })).toEqual({ id: 'rec-2' });
  });

  it('extracts case id from deeply nested records', () => {
    const record = {
      metadata: {
        links: [{ key: 'x' }],
      },
      payload: {
        oCaseID: 'WEB-12345678',
      },
    };

    expect(getCaseIdFromRecord(record)).toBe('WEB-12345678');
  });
});


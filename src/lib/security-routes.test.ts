import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ currentUser: vi.fn().mockResolvedValue(null) }));

import { POST as createProperty } from '../app/api/properties/route';
import { POST as recordFx } from '../app/api/admin/fx-rates/route';
import { POST as uploadDocument } from '../app/api/admin/documents/route';
import { POST as recordInvestment } from '../app/api/admin/investments/positions/route';
import { GET as readDocument } from '../app/api/documents/[id]/route';
import { GET as readNotification } from '../app/api/notifications/route';
import { PATCH as updateDeal } from '../app/api/enquiries/[id]/route';

const request = () => new NextRequest('http://localhost/api/test', { method: 'POST', body: '{}' });

describe('unauthenticated API boundaries', () => {
  it('blocks property, FX, document and investment writes', async () => {
    for (const handler of [createProperty, recordFx, uploadDocument, recordInvestment]) expect((await handler(request())).status).toBe(403);
  });
  it('blocks private document and notification reads', async () => {
    expect((await readDocument(new Request('http://localhost/api/documents/x'), { params: Promise.resolve({ id: 'x' }) })).status).toBe(401);
    expect((await readNotification()).status).toBe(401);
  });
  it('blocks deal changes before parsing request data', async () => {
    expect((await updateDeal(request(), { params: Promise.resolve({ id: 'x' }) })).status).toBe(401);
  });
});

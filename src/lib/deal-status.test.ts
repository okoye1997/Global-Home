import { describe, expect, it } from 'vitest';
import { canChangeDealStatus } from './deal-status';

describe('deal lifecycle', () => {
  it('lets an administrator progress an open enquiry', () => expect(canChangeDealStatus('open', 'awaiting_user', 'admin')).toBe(true));
  it('allows the customer to cancel but not complete a deal', () => {
    expect(canChangeDealStatus('in_progress', 'cancelled', 'user')).toBe(true);
    expect(canChangeDealStatus('in_progress', 'completed', 'user')).toBe(false);
  });
  it('does not reopen terminal deals', () => expect(canChangeDealStatus('closed', 'open', 'admin')).toBe(false));
});

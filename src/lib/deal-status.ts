export const dealStatuses = ['open', 'in_discussion', 'in_progress', 'awaiting_user', 'awaiting_admin', 'agreed', 'completed', 'cancelled', 'closed'] as const;
export type DealStatus = typeof dealStatuses[number];

const transitions: Record<DealStatus, readonly DealStatus[]> = {
  open: ['in_discussion', 'in_progress', 'awaiting_user', 'awaiting_admin', 'cancelled', 'closed'],
  in_discussion: ['in_progress', 'awaiting_user', 'awaiting_admin', 'agreed', 'cancelled', 'closed'],
  in_progress: ['awaiting_user', 'awaiting_admin', 'agreed', 'cancelled', 'closed'],
  awaiting_user: ['in_progress', 'awaiting_admin', 'agreed', 'cancelled', 'closed'],
  awaiting_admin: ['in_progress', 'awaiting_user', 'agreed', 'cancelled', 'closed'],
  agreed: ['completed', 'cancelled', 'closed'],
  completed: ['closed'],
  cancelled: [],
  closed: [],
};

export function canChangeDealStatus(current: DealStatus, next: DealStatus, role: 'admin' | 'user'): boolean {
  if (role === 'user') return next === 'cancelled' && !['completed', 'cancelled', 'closed'].includes(current);
  return transitions[current]?.includes(next) || false;
}

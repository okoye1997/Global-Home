'use client';

import { useEffect } from 'react';

export function MessageReadMarker({ conversationId }: { conversationId: string }) {
  useEffect(() => { void fetch(`/api/conversations/${conversationId}/messages`, { method: 'PATCH' }); }, [conversationId]);
  return null;
}

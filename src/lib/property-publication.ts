export const realPropertyFilter = {
  status: 'published',
  verificationStatus: 'verified',
  isDemo: false,
  verifiedAt: { $exists: true, $ne: null },
} as const;

export const ACADEMIC_SOURCE = 'globalhome-academic-v1';
export function academicInventoryEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== 'production' && env.MONGODB_DB_NAME === 'globalhome_dev' && env.ACADEMIC_INVENTORY_ENABLED === 'true';
}
export const publicPropertyFilter = academicInventoryEnabled()
  ? { status: 'published', $or: [
    { isDemo: false, verificationStatus: 'verified', verifiedAt: { $exists: true, $ne: null } },
    { isDemo: true, verificationStatus: 'sample', academicVisible: true, sourceProvider: ACADEMIC_SOURCE },
  ] }
  : realPropertyFilter;

export const propertyStatuses = ['draft','pending_verification','verified','published','suspended','archived','rejected'] as const;
export type PropertyStatus = typeof propertyStatuses[number];

const transitions: Record<PropertyStatus, readonly PropertyStatus[]> = {
  draft: ['pending_verification','verified','rejected','archived'],
  pending_verification: ['draft','verified','rejected','archived'],
  verified: ['published','pending_verification','suspended','rejected','archived'],
  published: ['verified','pending_verification','suspended','archived'],
  suspended: ['published','verified','pending_verification','archived'],
  archived: ['draft'],
  rejected: ['draft','pending_verification','verified','archived'],
};

export function assertWorkflowTransition(current: PropertyStatus, next: PropertyStatus) {
  if (current !== next && !transitions[current]?.includes(next)) throw new Error(`Cannot move property from ${current} to ${next}`);
}

export function assertPublicationTransition(property: {
  status: string; verificationStatus: string; isDemo: boolean; verifiedAt?: Date | null;
  verificationSource?: string | null; verificationReference?: string | null;
}, nextStatus: PropertyStatus) {
  if (nextStatus === 'verified') {
    if (property.isDemo) throw new Error('Demo properties cannot be verified');
    if (!property.verificationSource || !property.verificationReference) throw new Error('Verification source and reference are required');
    if (!['draft','pending_verification','rejected','published','suspended','verified'].includes(property.status)) throw new Error('Property cannot enter verification from this status');
  }
  if (nextStatus === 'published') {
    if (property.isDemo) throw new Error('Demo properties cannot be published');
    if (property.verificationStatus !== 'verified' || !property.verifiedAt || !property.verificationSource || !property.verificationReference) throw new Error('A recorded verification decision is required before publication');
    if (!['verified','suspended','published'].includes(property.status)) throw new Error('Property must be verified before publication');
  }
}

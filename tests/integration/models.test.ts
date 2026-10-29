import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditEvent, Conversation, Country, Document, Enquiry, Favourite, FxRate, IdentityVerification, InvestmentDistribution, InvestmentOffering, InvestmentPosition, InvestorProfile, Message, Notification, Property, PropertyMedia, User } from '../../src/lib/models';
import { publicPropertyFilter } from '../../src/lib/property-publication';

let server: MongoMemoryServer;
let adminId: mongoose.Types.ObjectId;
let userId: mongoose.Types.ObjectId;
let propertyId: mongoose.Types.ObjectId;

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri('globalhome_integration_test'));
  await Promise.all([User.init(), Property.init(), Country.init(), Favourite.init(), InvestmentDistribution.init()]);
  const users = await User.create([
    { fullName: 'Test Admin', email: 'admin@invalid.test', phone: '+15555550101', countryCode: 'US', passwordHash: 'test-only', role: 'admin', termsAcceptedAt: new Date() },
    { fullName: 'Test User', email: 'user@invalid.test', phone: '+15555550102', countryCode: 'US', passwordHash: 'test-only', emailVerifiedAt: new Date(), termsAcceptedAt: new Date() },
  ]);
  adminId = users[0]._id; userId = users[1]._id;
});
afterAll(async () => { await mongoose.disconnect(); if (server) await server.stop(); });

describe('isolated MongoDB models', () => {
  it('enforces unique user email', async () => {
    await expect(User.create({ fullName: 'Duplicate', email: 'USER@INVALID.TEST', phone: '+15555550103', countryCode: 'US', passwordHash: 'test-only', termsAcceptedAt: new Date() })).rejects.toThrow();
  });
  it('stores a real-inventory draft outside the public query until verified and published', async () => {
    const country = await Country.create({ code: 'US', iso3: 'USA', name: 'United States', officialName: 'United States of America', flagEmoji: '🇺🇸', flagAssetUrl: '/flags/us.svg', currencyName: 'US Dollar', currencyCode: 'USD', currencySymbol: '$', locale: 'en-US' });
    expect(country.minimumInventoryTarget).toBe(100);
    const property = await Property.create({ title: 'Test property', slug: 'isolated-test-property', propertyType: 'house', purpose: 'buy', countryCode: 'US', city: 'Test City', currencyCode: 'USD', localPriceMinor: 50_000_000, usdReferenceEquivalent: 500_000, fxRate: 1, fxEffectiveAt: new Date(), fxProvider: 'integration-test', adminVendorId: adminId, createdBy: adminId, status: 'draft', verificationStatus: 'pending', isDemo: false });
    propertyId = property._id;
    expect(await Property.countDocuments(publicPropertyFilter)).toBe(0);
    await Property.updateOne({ _id: propertyId }, { $set: { status: 'published', verificationStatus: 'verified', verifiedAt: new Date(), verificationSource: 'admin_review', verificationReference: 'test-evidence' } });
    expect(await Property.countDocuments(publicPropertyFilter)).toBe(1);
    await PropertyMedia.create({ propertyId, objectKey: 'integration-only', alt: 'Test exterior', mimeType: 'image/webp', sizeBytes: 1000, width: 300, height: 200, rightsConfirmedAt: new Date(), uploadedBy: adminId });
    expect(await PropertyMedia.countDocuments({ propertyId })).toBe(1);
  });
  it('persists FX, favourites, enquiries, messages, notifications and audit relationships', async () => {
    await FxRate.create({ baseCurrency: 'USD', quoteCurrency: 'USD', rate: 1, provider: 'integration-test', effectiveAt: new Date(), fetchedAt: new Date(), approved: true });
    await Favourite.create({ userId, propertyId });
    const enquiry = await Enquiry.create({ userId, propertyId, purpose: 'buy', localAskingPriceMinor: 50_000_000, currencyCode: 'USD', countryCode: 'US' });
    const conversation = await Conversation.create({ enquiryId: enquiry._id, participants: [userId, adminId] });
    await Message.create({ conversationId: conversation._id, senderId: userId, body: 'Test enquiry' });
    await Notification.create({ userId, key: 'enquiry.created' });
    await AuditEvent.create({ actorId: adminId, action: 'integration.test', targetType: 'Enquiry', targetId: enquiry._id });
    expect(await Favourite.countDocuments({ userId })).toBe(1);
    expect(await Message.countDocuments({ conversationId: conversation._id })).toBe(1);
    expect(await Notification.countDocuments({ userId, readAt: null })).toBe(1);
  });
  it('keeps identity, investment and private document metadata separate', async () => {
    const document = await Document.create({ ownerId: userId, objectKey: 'private-test-only', kind: 'passport', mimeType: 'application/pdf', sizeBytes: 100, visibility: 'private' });
    await IdentityVerification.create({ userId, status: 'submitted', documentIds: [document._id] });
    await InvestorProfile.create({ userId, suitability: 'integration test', riskAcknowledgedAt: new Date() });
    const offering = await InvestmentOffering.create({ propertyId, termsVersion: 'v1', termsReference: 'test-terms-ref', assumptions: 'integration test assumptions', riskDisclosure: 'integration test risks', status: 'approved' });
    const position = await InvestmentPosition.create({ userId, offeringId: offering._id, amountMinor: 1_000_000, currencyCode: 'USD', signedTermsReference: 'test-signature-ref' });
    await InvestmentDistribution.create({ positionId: position._id, amountMinor: 100, currencyCode: 'USD', period: '2026-01', paymentReference: 'test-payment-ref', paidAt: new Date(), recordedBy: adminId });
    expect(await IdentityVerification.countDocuments({ userId, status: 'submitted' })).toBe(1);
    expect(await InvestmentDistribution.countDocuments({ positionId: position._id })).toBe(1);
    await expect(InvestmentDistribution.create({ positionId: position._id, amountMinor: 100, currencyCode: 'USD', period: '2026-01', paymentReference: 'test-payment-ref', paidAt: new Date(), recordedBy: adminId })).rejects.toThrow();
  });
});

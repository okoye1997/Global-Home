import Link from 'next/link';
import mongoose from 'mongoose';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale, money } from '@/lib/i18n';
import { msg } from '@/lib/messages';
import { Conversation, Enquiry, Favourite, InvestmentPosition, Message, Notification, Property } from '@/lib/models';
import { ConversationComposer } from '@/components/ConversationComposer';
import { CountryBadge } from '@/components/CountryBadge';
import { publicPropertyFilter } from '@/lib/property-publication';
import { NotificationReadButton } from '@/components/NotificationReadButton';
import { DealStatusControl } from '@/components/DealStatusControl';
import type { DealStatus } from '@/lib/deal-status';
import { MessageReadMarker } from '@/components/MessageReadMarker';

export default async function Dashboard({ params, searchParams }: { params: Promise<{locale:string}>; searchParams: Promise<{conversation?:string}> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  const { conversation: requested } = await searchParams;
  const [enquiries, savedCount, investments, unreadNotifications, favourites, notices] = await Promise.all([
    Enquiry.find({userId:user._id}).sort({createdAt:-1}).limit(50).lean(),
    Favourite.countDocuments({userId:user._id}),
    InvestmentPosition.countDocuments({userId:user._id}),
    Notification.countDocuments({userId:user._id,readAt:null}),
    Favourite.find({userId:user._id}).sort({createdAt:-1}).limit(20).select('propertyId').lean(),
    Notification.find({userId:user._id}).sort({createdAt:-1}).limit(20).select('key payload readAt createdAt').lean(),
  ]);
  const propertyIds = enquiries.map(item => item.propertyId);
  const [properties, conversations, savedProperties] = await Promise.all([
    Property.find({_id:{$in:propertyIds}}).select('title slug').lean(),
    Conversation.find({enquiryId:{$in:enquiries.map(item=>item._id)},participants:user._id}).lean(),
    Property.find({_id:{$in:favourites.map(item=>item.propertyId)},...publicPropertyFilter}).select('title slug city countryCode localPriceMinor currencyCode').lean(),
  ]);
  const propertyById = new Map(properties.map(item=>[String(item._id),item]));
  const savedById = new Map(savedProperties.map(item=>[String(item._id),item]));
  const conversationByEnquiry = new Map(conversations.map(item=>[String(item.enquiryId),item]));
  const selected = requested && mongoose.isValidObjectId(requested) ? conversations.find(item=>String(item._id)===requested) : undefined;
  const messages = selected ? await Message.find({conversationId:selected._id}).sort({createdAt:1}).limit(500).lean() : [];
  const unreadMessages = await Message.countDocuments({ conversationId: { $in: conversations.map(item => item._id) }, senderId: { $ne: user._id }, readAt: null });
  return <main className="section wrap"><h1>{msg(locale,'dashboard','welcome')}, {user.fullName}</h1><div className="dashboard-layout"><nav className="dashboard-nav" aria-label="Dashboard"><a href="#overview">{msg(locale,'dashboard','overview')}</a><a href="#enquiries">{msg(locale,'dashboard','enquiries')}</a><a href="#messages">{msg(locale,'dashboard','messages')}</a><Link href={`/${locale}/dashboard/investments`}>{msg(locale,'dashboard','investments')}</Link><a href="#saved">{msg(locale,'dashboard','saved')}</a><Link href={`/${locale}/dashboard/recent`}>Recently viewed</Link><a href="#notifications">{msg(locale,'dashboard','notifications')}</a><a href="#verification">{msg(locale,'dashboard','verification')}</a><Link href={`/${locale}/dashboard/documents`}>{msg(locale,'dashboard','documents')}</Link><Link href={`/${locale}/dashboard/statements`}>{msg(locale,'dashboard','statements')}</Link><a href="#profile">{msg(locale,'dashboard','profile')}</a></nav><div>
    <section id="overview" className="cards"><div className="panel"><h2>{msg(locale,'dashboard','enquiries')}</h2><p>{enquiries.length}</p></div><div className="panel"><h2>{msg(locale,'dashboard','saved')}</h2><p>{savedCount}</p></div><div className="panel" id="investments"><h2>{msg(locale,'dashboard','investments')}</h2><p>{investments}</p><Link href={`/${locale}/dashboard/investments`}>View investments</Link></div><div className="panel"><h2>{msg(locale,'dashboard','notifications')}</h2><p>{unreadNotifications}</p></div></section>
    <section id="enquiries" className="section"><h2>{msg(locale,'dashboard','enquiries')}</h2>{enquiries.length ? <div className="dashboard-records">{enquiries.map(item=>{const property=propertyById.get(String(item.propertyId));const conversation=conversationByEnquiry.get(String(item._id));return <div className="panel" key={String(item._id)}><strong>{property?.title || 'Property'}</strong><p><CountryBadge code={item.countryCode} compact/> · {item.purpose} · {money(item.localAskingPriceMinor,item.currencyCode,locale)} · {item.status}</p><DealStatusControl id={String(item._id)} status={item.status as DealStatus} role="user" currencyCode={item.currencyCode}/>{property && <Link href={`/${locale}/properties/${property.slug}`}>View property</Link>}{conversation && <> · <Link href={`?conversation=${conversation._id}#messages`}>Open messages</Link></>}</div>})}</div> : <p className="empty">{msg(locale,'dashboard','noRecords')}</p>}</section>
    <section id="messages" className="section"><h2>{msg(locale,'dashboard','messages')}{unreadMessages ? ` (${unreadMessages})` : ''}</h2>{selected ? <div className="panel"><MessageReadMarker conversationId={String(selected._id)}/><div className="message-thread">{messages.map(item=><div className="message" key={String(item._id)}><strong>{String(item.senderId)===String(user._id)?'You':'Admin'}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString(locale)}</small></div>)}</div><ConversationComposer id={String(selected._id)}/></div> : <p className="empty">Select an enquiry to open its conversation.</p>}</section>
    <section id="saved" className="section"><h2>{msg(locale,'dashboard','saved')}</h2>{savedProperties.length ? <div className="dashboard-records">{favourites.map(item=>{const property=savedById.get(String(item.propertyId));return property && <div className="panel" key={String(item._id)}><Link href={`/${locale}/properties/${property.slug}`}><strong>{property.title}</strong></Link><p><CountryBadge code={property.countryCode} city={property.city}/> · {money(property.localPriceMinor,property.currencyCode,locale)}</p></div>})}</div> : <p className="empty">{msg(locale,'dashboard','noRecords')}</p>}</section>
    <section id="notifications" className="section"><h2>{msg(locale,'dashboard','notifications')}</h2>{notices.length ? <div className="dashboard-records">{notices.map(item=><div className="panel" key={String(item._id)}><strong>{item.key?.replaceAll('.',' · ')}</strong><p>{new Date(item.createdAt).toLocaleString(locale)}</p>{!item.readAt && <><span className="badge">New</span> <NotificationReadButton id={String(item._id)}/></>}</div>)}</div> : <p className="empty">{msg(locale,'dashboard','noRecords')}</p>}</section>
    <section id="verification" className="section"><h2>{msg(locale,'dashboard','verification')}</h2><p><Link href={`/${locale}/dashboard/verification`}>View verification status or submit a document</Link></p></section>
    <section id="profile" className="section"><h2>{msg(locale,'dashboard','profile')}</h2><div className="panel"><p>{user.fullName} · {user.email}</p><CountryBadge code={user.countryCode}/><p><Link href={`/${locale}/dashboard/settings`}>{msg(locale,'dashboard','settings')}</Link></p></div></section>
  </div></div></main>;
}

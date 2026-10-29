import mongoose from 'mongoose';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale, money } from '@/lib/i18n';
import { msg } from '@/lib/messages';
import { Conversation, Country, Enquiry, FxRate, Message, Property, User } from '@/lib/models';
import { ConversationComposer } from '@/components/ConversationComposer';
import { CountryBadge } from '@/components/CountryBadge';
import { DealStatusControl } from '@/components/DealStatusControl';
import type { DealStatus } from '@/lib/deal-status';
import { MessageReadMarker } from '@/components/MessageReadMarker';

export default async function Admin({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{conversation?:string}>}){
  const {locale}=await params;
  if(!isLocale(locale))notFound();
  const user=await currentUser();
  if(!user)redirect(`/${locale}/login`);
  if(user.role!=='admin')notFound();
  const {conversation:requested}=await searchParams;
  const [users,properties,enquiryCount,countries,fxRates,enquiries]=await Promise.all([
    User.countDocuments(),Property.countDocuments(),Enquiry.countDocuments(),Country.countDocuments({enabled:true}),FxRate.countDocuments({approved:true}),
    Enquiry.find().sort({createdAt:-1}).limit(100).lean(),
  ]);
  const [conversations,propertyRecords,userRecords]=await Promise.all([
    Conversation.find({enquiryId:{$in:enquiries.map(item=>item._id)},participants:user._id}).lean(),
    Property.find({_id:{$in:enquiries.map(item=>item.propertyId)}}).select('title slug').lean(),
    User.find({_id:{$in:enquiries.map(item=>item.userId)}}).select('fullName email').lean(),
  ]);
  const conversationByEnquiry=new Map(conversations.map(item=>[String(item.enquiryId),item]));
  const propertyById=new Map(propertyRecords.map(item=>[String(item._id),item]));
  const userById=new Map(userRecords.map(item=>[String(item._id),item]));
  const selected=requested&&mongoose.isValidObjectId(requested)?conversations.find(item=>String(item._id)===requested):undefined;
  const messages=selected?await Message.find({conversationId:selected._id}).sort({createdAt:1}).limit(500).lean():[];
  const unreadMessages=await Message.countDocuments({conversationId:{$in:conversations.map(item=>item._id)},senderId:{$ne:user._id},readAt:null});
  return <main className="section wrap"><h1>{msg(locale,'admin','dashboard')}</h1><div className="dashboard-layout"><nav className="dashboard-nav" aria-label="Admin navigation"><a href="#overview">Overview</a><Link href={`/${locale}/admin/users`}>Users</Link><Link href={`/${locale}/admin/properties`}>Properties</Link><Link href={`/${locale}/admin/inventory`}>Inventory target &amp; imports</Link><Link href={`/${locale}/admin/verification`}>ID verification</Link><Link href={`/${locale}/admin/investments`}>Investments</Link><Link href={`/${locale}/admin/documents`}>Documents</Link><Link href={`/${locale}/admin/reports`}>Reports</Link><Link href={`/${locale}/admin/languages`}>Languages &amp; translations</Link><Link href={`/${locale}/admin/audit`}>Audit logs</Link><a href="#enquiries">Enquiries</a><a href="#messages">Conversations</a><Link href={`/${locale}/admin/countries`}>Countries &amp; currencies</Link><Link href={`/${locale}/admin/fx-rates`}>FX rates</Link><Link href={`/${locale}/admin/settings`}>Settings</Link></nav><div>
    <section id="overview" className="cards">{[[msg(locale,'admin','users'),users],[msg(locale,'admin','properties'),properties],[msg(locale,'admin','enquiries'),enquiryCount],[msg(locale,'admin','countries'),countries],[msg(locale,'admin','fx'),fxRates]].map(([label,count])=><div className="panel" key={label}><h2>{label}</h2><p>{count}</p></div>)}</section>
    <section id="enquiries" className="section"><h2>{msg(locale,'admin','enquiries')}</h2><div className="dashboard-records">{enquiries.map(item=>{const property=propertyById.get(String(item.propertyId));const customer=userById.get(String(item.userId));const conversation=conversationByEnquiry.get(String(item._id));return <div className="panel" key={String(item._id)}><strong>{property?.title||'Property'}</strong><p>{customer?.fullName||'User'} · <CountryBadge code={item.countryCode} compact/> · {item.purpose} · {money(item.localAskingPriceMinor,item.currencyCode,locale)} · {item.status}</p><DealStatusControl id={String(item._id)} status={item.status as DealStatus} role="admin" currencyCode={item.currencyCode}/>{property&&<Link href={`/${locale}/properties/${property.slug}`}>View property</Link>}{conversation&&<> · <Link href={`?conversation=${conversation._id}#messages`}>Open conversation</Link></>}</div>})}</div></section>
    <section id="messages" className="section"><h2>Conversations{unreadMessages ? ` (${unreadMessages})` : ''}</h2>{selected?<div className="panel"><MessageReadMarker conversationId={String(selected._id)}/><div className="message-thread">{messages.map(item=><div className="message" key={String(item._id)}><strong>{String(item.senderId)===String(user._id)?'Admin':'User'}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString(locale)}</small></div>)}</div><ConversationComposer id={String(selected._id)}/></div>:<p className="empty">Select an enquiry to open its conversation.</p>}</section>
    <section id="settings" className="section"><h2>Settings</h2><p><Link href={`/${locale}/admin/settings`}>Manage public contact details</Link></p></section>
  </div></div></main>;
}


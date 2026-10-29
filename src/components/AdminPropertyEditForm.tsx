'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { minorFactor } from '@/lib/currency';

type Editable = { id:string; title:string; description:string; region:string; city:string; addressText:string; latitude:number; longitude:number; localPriceMinor:number; currencyCode:string; bedrooms?:number; bathrooms?:number; landAreaSqm?:number; buildingAreaSqm?:number; amenities:string[] };
export function AdminPropertyEditForm({ property }: { property: Editable }) {
  const router=useRouter(); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage('');
    const form=new FormData(event.currentTarget);
    const facts=Object.fromEntries(['bedrooms','bathrooms','landAreaSqm','buildingAreaSqm'].filter(name=>String(form.get(name)||'').trim()!=='').map(name=>[name,Number(form.get(name))]));
    const amenities=String(form.get('amenities')||'').split(',').map(value=>value.trim()).filter(Boolean);
    const values={title:String(form.get('title')),description:String(form.get('description')),region:String(form.get('region')),city:String(form.get('city')),addressText:String(form.get('addressText')),latitude:Number(form.get('latitude')),longitude:Number(form.get('longitude')),localPriceMinor:Math.round(Number(form.get('localPrice'))*minorFactor(property.currencyCode)),...facts,amenities};
    const payload=Object.fromEntries(Object.entries(values).filter(([key,value])=>key==='amenities'?JSON.stringify(value)!==JSON.stringify(property.amenities):value!==property[key as keyof Editable]));
    if(!Object.keys(payload).length){setMessage('No changes to save.');setBusy(false);return;}
    try{const response=await fetch(`/api/properties/${property.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Update failed');setMessage('Property updated. Verification must be recorded again before publication.');router.refresh();}catch(error){setMessage(error instanceof Error?error.message:'Update failed');}finally{setBusy(false);}
  }
  return <form className="form panel" onSubmit={submit}><h2>Edit listing details</h2><p className="muted">Changing listing facts or price requires another verification decision.</p><label>Title<input name="title" minLength={3} defaultValue={property.title} required/></label><label>Region<input name="region" defaultValue={property.region}/></label><label>City<input name="city" defaultValue={property.city} required/></label><label>Address<input name="addressText" defaultValue={property.addressText}/></label><label>Latitude<input name="latitude" type="number" min={-90} max={90} step="any" defaultValue={property.latitude} required/></label><label>Longitude<input name="longitude" type="number" min={-180} max={180} step="any" defaultValue={property.longitude} required/></label><label>Local price ({property.currencyCode})<input name="localPrice" type="number" min="0.01" step="any" defaultValue={property.localPriceMinor/minorFactor(property.currencyCode)} required/></label><label>Bedrooms<input name="bedrooms" type="number" min="0" max="1000" step="1" defaultValue={property.bedrooms}/></label><label>Bathrooms<input name="bathrooms" type="number" min="0" max="1000" step="1" defaultValue={property.bathrooms}/></label><label>Land area (m²)<input name="landAreaSqm" type="number" min="0" step="any" defaultValue={property.landAreaSqm}/></label><label>Building area (m²)<input name="buildingAreaSqm" type="number" min="0" step="any" defaultValue={property.buildingAreaSqm}/></label><label>Amenities, separated by commas<input name="amenities" defaultValue={property.amenities.join(', ')}/></label><label>Description<textarea name="description" rows={5} defaultValue={property.description}/></label><button className="button" disabled={busy}>Save listing details</button>{message&&<p role="status">{message}</p>}</form>;
}

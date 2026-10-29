'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CountryAvailabilityButton({code,enabled}:{code:string;enabled:boolean}){
  const router=useRouter();const [pending,setPending]=useState(false);const [error,setError]=useState('');
  async function toggle(){setPending(true);setError('');try{const response=await fetch('/api/admin/countries',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({code,enabled:!enabled})});if(!response.ok)throw new Error((await response.json()).error||'Update failed');router.refresh();}catch(cause){setError(cause instanceof Error?cause.message:'Update failed');}finally{setPending(false);}}
  return <><button type="button" className="button button-secondary" disabled={pending} onClick={toggle}>{pending?'Saving…':enabled?'Disable':'Enable'}</button>{error&&<span role="alert">{error}</span>}</>;
}

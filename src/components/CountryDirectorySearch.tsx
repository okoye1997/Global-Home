'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CountryDirectorySearch({ initial }: { initial: string }) {
  const router=useRouter();
  const [value,setValue]=useState(initial);
  return <form className="filters" onSubmit={event=>{event.preventDefault();router.push(`?q=${encodeURIComponent(value.trim())}`);}}><input type="search" value={value} onChange={event=>setValue(event.target.value)} placeholder="Search name, ISO code, or currency" aria-label="Search countries"/><button className="button">Search</button></form>;
}

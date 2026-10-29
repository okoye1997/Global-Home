'use client';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import registry from '@/data/countries.json';
import { getCountryByCode, searchCountries } from '@/lib/country-identity';

export function CountrySelector({ value = '', onSelect, name, label = 'Country', countries = registry.filter(country => country.enabled), allowEmpty = true }: {
  value?: string; onSelect?: (code: string) => void; name?: string; label?: string; countries?: typeof registry; allowEmpty?: boolean;
}) {
  const [selected, setSelected] = useState(value);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [available, setAvailable] = useState(countries);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { if (!open) return; const controller=new AbortController();fetch('/api/countries',{signal:controller.signal}).then(response=>response.ok?response.json():null).then(data=>{if(data?.items)setAvailable(data.items.filter((item:typeof registry[number])=>item.enabled&&item.flagAssetUrl));}).catch(()=>{});return()=>controller.abort(); }, [open]);
  const activeCode = onSelect ? value : selected;
  const active = available.find(country => country.code === activeCode) || getCountryByCode(activeCode);
  const results = searchCountries(search, available).slice(0, 100);
  function choose(code: string) { setSelected(code); setOpen(false); setSearch(''); onSelect?.(code); }
  return <div className="country-select"><button type="button" className="country-select-trigger" onClick={() => setOpen(true)} aria-label={label} aria-haspopup="dialog" aria-expanded={open}>{active ? <><Image className="country-flag" src={active.flagAssetUrl} width={32} height={24} alt="" unoptimized/><span>{active.name} <small>{active.currencyCode} · {active.currencySymbol}</small></span></> : <span>{label}</span>}<ChevronDown className="country-select-chevron" size={18} aria-hidden="true"/></button>{name && <input type="hidden" name={name} value={activeCode}/>}
    {open && <div className="country-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><div className="country-dialog" role="dialog" aria-modal="true" aria-label={label} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); if(event.key === 'Tab'){const focusable=[...event.currentTarget.querySelectorAll<HTMLElement>('button,input')];const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}} }}><div className="country-dialog-head"><strong>{label}</strong><button type="button" onClick={() => setOpen(false)} aria-label="Close country selector">×</button></div><input ref={input} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search country, ISO code, or currency" aria-label="Search countries"/><div className="country-results">{allowEmpty && <button type="button" onClick={() => choose('')}>All countries</button>}{results.map(country => <button type="button" key={country.code} onClick={() => choose(country.code)}><Image className="country-flag" src={country.flagAssetUrl} width={32} height={24} alt={`${country.name} flag`} unoptimized/><span><strong>{country.name}</strong><small>{country.code} · {country.currencyName} · {country.currencyCode} ({country.currencySymbol})</small></span></button>)}{!results.length && <p>No matching countries</p>}</div></div></div>}
  </div>;
}

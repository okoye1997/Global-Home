export function currencyDigits(currency:string){return new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits??2}
export function minorFactor(currency:string){return 10**currencyDigits(currency)}

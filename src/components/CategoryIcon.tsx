type Category = 'houses' | 'lands' | 'apartments' | 'hotels' | 'events' | 'investment';

export function CategoryIcon({ kind }: { kind: Category }) {
  const shared = { className: 'category-icon', width: 36, height: 36, viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  switch (kind) {
    case 'houses': return <svg {...shared}><path d="M4 23 24 7l20 16M9 19V42h30V19M19 42V29h10v13M12 25h5v6h-5M31 25h5v6h-5M32 11V5h6v11"/><path d="M5 42h38"/></svg>;
    case 'lands': return <svg {...shared}><path d="m5 34 14-8 24 9-14 8L5 34ZM19 26v9m10 8v-9M5 34v5l24 8 14-8v-4M29 35l14-8"/><path d="M30 25c-3-4-1-8 3-12 4 4 6 8 3 12-2 3-4 3-6 0Zm3 1v5M10 23c-2-3-1-6 2-9 3 3 4 6 2 9-1 2-3 2-4 0Zm2 1v6"/></svg>;
    case 'apartments': return <svg {...shared}><path d="M9 43V9l15-4 15 4v34M5 43h38M20 43V34h8v9"/><path d="M14 13h5v5h-5m15-5h5v5h-5M14 23h5v5h-5m15-5h5v5h-5M24 10v19M9 9h30"/></svg>;
    case 'hotels': return <svg {...shared}><path d="M6 43h36M9 43V17h30v26M5 17h38l-3-5H8l-3 5ZM14 12V7l10-4 10 4v5M19 43V31h10v12"/><path d="M14 22h5v5h-5m15-5h5v5h-5M16 35h-3m22 0h-3M24 8v4"/></svg>;
    case 'events': return <svg {...shared}><path d="M5 43h38M9 43V20l15-10 15 10v23M5 20 24 7l19 13M17 43V29h14v14M13 23h4m14 0h4M20 29v14m8-14v14"/><path d="m7 8 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Zm34 0 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"/></svg>;
    case 'investment': return <svg {...shared}><path d="M5 43h38M9 43V24h13v19M14 29h3m-3 5h3M26 43V18h13v25M30 23h4m-4 6h4m-4 6h4"/><path d="m8 17 9-8 8 5L39 3m-8 0h8v8"/></svg>;
  }
}

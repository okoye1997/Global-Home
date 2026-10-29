import type { Locale } from './i18n';

const english = {
  login: 'Login', register: 'Register', dashboard: 'Dashboard', hotelsEvents: 'Hotels & Events',
  heroLineOne: 'Find, Rent, Buy or', heroLineTwo: 'Invest in Properties', heroLineThree: 'Worldwide',
  heroDescription: 'Houses, Apartments, Lands, Hotels, Commercial Properties and Investment Opportunities in over 190+ Countries.',
  country: 'Country', propertyType: 'Property type', purpose: 'Purpose', anyType: 'Any type', searchProperties: 'Search Properties',
  houses: 'Houses', housesDetail: 'For Sale & Rent', lands: 'Lands', landsDetail: 'Residential, Commercial',
  apartments: 'Apartments', apartmentsDetail: 'Modern Living', hotels: 'Hotels', hotelsDetail: 'Tourism & Business',
  events: 'Events Centre', eventsDetail: 'Weddings & Events', investment: 'Investment', investmentDetail: 'Investment opportunities',
  countriesCount: 'Countries', propertyCount: 'Properties', listingsUnavailable: 'Inventory unavailable',
  verifiedListings: 'Verified Listings', verifiedDetail: 'All Properties', adminSupport: 'Admin Support', supportDetail: 'Contact anytime',
  globalOpportunities: 'Global Opportunities', opportunitiesDetail: 'Buy · Rent · Invest · Lease',
  email: 'Email support', whatsApp: 'WhatsApp support', menu: 'Menu', language: 'Language',
  terms: 'Terms', privacy: 'Privacy', about: 'About', contact: 'Contact', properties: 'Properties', countries: 'Countries',
} as const;
type Key = keyof typeof english;
const translated: Record<string, Partial<Record<Key, string>>> = {
  fr: { login: 'Connexion', register: "S'inscrire", dashboard: 'Tableau de bord', hotelsEvents: 'Hôtels et événements', heroLineOne: 'Trouvez, louez, achetez ou', heroLineTwo: 'investissez dans des biens', heroLineThree: 'partout dans le monde', heroDescription: "Maisons, appartements, terrains, hôtels, locaux commerciaux et investissements dans plus de 190 pays.", country: 'Pays', propertyType: 'Type de bien', purpose: 'Projet', anyType: 'Tout type', searchProperties: 'Rechercher des biens', houses: 'Maisons', housesDetail: 'Vente et location', lands: 'Terrains', landsDetail: 'Résidentiel, commercial', apartments: 'Appartements', apartmentsDetail: 'Vie moderne', hotels: 'Hôtels', hotelsDetail: 'Tourisme et affaires', events: 'Centres événementiels', eventsDetail: 'Mariages et événements', investment: 'Investissement', investmentDetail: 'Opportunités d’investissement', countriesCount: 'Pays', propertyCount: 'Biens publiés', listingsUnavailable: 'Inventaire indisponible', verifiedListings: 'Annonces vérifiées', verifiedDetail: 'Biens publiés', adminSupport: 'Assistance', supportDetail: 'Contactez-nous', globalOpportunities: 'Opportunités mondiales', opportunitiesDetail: 'Acheter · Louer · Investir · Bail', email: 'Contacter par e-mail', whatsApp: 'Contacter par WhatsApp', menu: 'Menu', language: 'Langue', terms: 'Conditions', privacy: 'Confidentialité', about: 'À propos', contact: 'Contact', properties: 'Biens', countries: 'Pays' },
  ar: { login: 'دخول', register: 'إنشاء حساب', dashboard: 'لوحة التحكم', hotelsEvents: 'الفنادق والمناسبات', heroLineOne: 'ابحث أو استأجر أو اشترِ أو', heroLineTwo: 'استثمر في العقارات', heroLineThree: 'حول العالم', heroDescription: 'منازل وشقق وأراضٍ وفنادق وعقارات تجارية وفرص استثمارية في أكثر من 190 دولة.', country: 'البلد', propertyType: 'نوع العقار', purpose: 'الغرض', anyType: 'أي نوع', searchProperties: 'ابحث عن عقارات', houses: 'منازل', housesDetail: 'للبيع والإيجار', lands: 'أراضٍ', landsDetail: 'سكنية وتجارية', apartments: 'شقق', apartmentsDetail: 'حياة عصرية', hotels: 'فنادق', hotelsDetail: 'سياحة وأعمال', events: 'مراكز مناسبات', eventsDetail: 'أعراس ومناسبات', investment: 'استثمار', investmentDetail: 'فرص استثمارية', countriesCount: 'دول', propertyCount: 'عقارات منشورة', listingsUnavailable: 'المخزون غير متاح', verifiedListings: 'عقارات موثقة', verifiedDetail: 'عقارات منشورة', adminSupport: 'دعم الإدارة', supportDetail: 'تواصل معنا', globalOpportunities: 'فرص عالمية', opportunitiesDetail: 'شراء · إيجار · استثمار · تأجير', email: 'البريد الإلكتروني للدعم', whatsApp: 'واتساب الدعم', menu: 'القائمة', language: 'اللغة', terms: 'الشروط', privacy: 'الخصوصية', about: 'حول', contact: 'تواصل', properties: 'العقارات', countries: 'الدول' },
};

export function landingText(locale: Locale, key: Key): string { return translated[locale]?.[key] || english[key]; }

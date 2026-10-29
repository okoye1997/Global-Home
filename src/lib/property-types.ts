export const propertyTypes = ['house','apartment','duplex','luxury-home','land','residential-land','commercial-land','agricultural-land','hotel','resort','event-centre','commercial','office','warehouse','retail','new-development','investment-property'] as const;
export type PropertyType = (typeof propertyTypes)[number];

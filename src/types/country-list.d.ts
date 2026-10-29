declare module 'country-list' {
  const countryList: { getCodes(): string[]; getName(code: string): string | undefined };
  export default countryList;
}

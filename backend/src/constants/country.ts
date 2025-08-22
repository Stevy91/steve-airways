export const COUNTRIES = [
  { code: 'ht', name: 'Haiti' },
  { code: 'fr', name: 'France' },
  { code: 'us', name: 'États-Unis' },
  { code: 'gb', name: 'Royaume-Uni' },
  // Ajoutez tous les pays nécessaires
] as const;

export type CountryCode = typeof COUNTRIES[number]['code'];
export type CountryName = typeof COUNTRIES[number]['name'];
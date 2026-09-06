// Presentation only: preserve API records, IDs, authentication and stored evidence.
export function displayBrand(value: string): string {
  return value.replace(/hydra/gi, (brand) => brand === brand.toUpperCase() ? "KORYN" : brand === brand.toLowerCase() ? "koryn" : "Koryn");
}

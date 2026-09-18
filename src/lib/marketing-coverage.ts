/**
 * Public guide to residence funding rules, not a live availability response.
 * Source: PlatformCoverageService.residenceCurrencies / SEPA_RESIDENCES.
 * Actual options are intersected with enabled upstream coverage during setup.
 * Payout currencies are destination-dependent (RemoteBankAccountRequirements),
 * so they must not be inferred from the customer's residence or funding list.
 * Geographic marker positions are approximate country centers.
 */
export type MarketingCountry = {
  /** ISO 3166-1 numeric id, matching the local world-atlas map. */
  code: string;
  name: string;
  iso2: string;
  lat: number;
  lon: number;
  payIn: string[];
};

type Residence = [code: string, name: string, iso2: string, lat: number, lon: number];
const SEPA_RESIDENCES: Residence[] = [
  ["040", "Austria", "AT", 47.5, 14.5],
  ["056", "Belgium", "BE", 50.5, 4.5],
  ["100", "Bulgaria", "BG", 42.7, 25.5],
  ["191", "Croatia", "HR", 45.1, 15.2],
  ["196", "Cyprus", "CY", 35.1, 33.4],
  ["203", "Czechia", "CZ", 49.8, 15.5],
  ["208", "Denmark", "DK", 56.3, 9.5],
  ["233", "Estonia", "EE", 58.6, 25.0],
  ["246", "Finland", "FI", 64.0, 26.0],
  ["250", "France", "FR", 46.2, 2.2],
  ["276", "Germany", "DE", 51.2, 10.4],
  ["300", "Greece", "GR", 39.1, 21.8],
  ["348", "Hungary", "HU", 47.2, 19.5],
  ["352", "Iceland", "IS", 64.9, -19.0],
  ["372", "Ireland", "IE", 53.1, -8.0],
  ["380", "Italy", "IT", 41.9, 12.5],
  ["428", "Latvia", "LV", 56.9, 24.6],
  ["438", "Liechtenstein", "LI", 47.2, 9.6],
  ["440", "Lithuania", "LT", 55.2, 23.9],
  ["442", "Luxembourg", "LU", 49.8, 6.1],
  ["470", "Malta", "MT", 35.9, 14.4],
  ["528", "Netherlands", "NL", 52.1, 5.3],
  ["578", "Norway", "NO", 61.0, 8.5],
  ["616", "Poland", "PL", 51.9, 19.1],
  ["620", "Portugal", "PT", 39.4, -8.2],
  ["642", "Romania", "RO", 45.9, 24.9],
  ["703", "Slovakia", "SK", 48.7, 19.7],
  ["705", "Slovenia", "SI", 46.2, 15.0],
  ["724", "Spain", "ES", 40.5, -3.7],
  ["752", "Sweden", "SE", 62.0, 15.0],
];

export const MARKETING_COUNTRIES: MarketingCountry[] = [
  {code: "566", name: "Nigeria", iso2: "NG", lat: 9.1, lon: 8.7, payIn: ["EUR", "GBP", "NGN"]},
  {code: "826", name: "United Kingdom", iso2: "GB", lat: 54.5, lon: -3.4, payIn: ["GBP", "EUR"]},
  {code: "840", name: "United States", iso2: "US", lat: 39.8, lon: -98.6, payIn: ["USD"]},
  ...SEPA_RESIDENCES.map(([code, name, iso2, lat, lon]) => ({code, name, iso2, lat, lon, payIn: ["EUR", "GBP"]})),
];

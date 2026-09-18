import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";
import {MARKETING_COUNTRIES} from "./marketing-coverage";

describe("public residence funding guide", () => {
  it.each([
    ["NG", ["EUR", "GBP", "NGN"]],
    ["US", ["USD"]],
    ["GB", ["GBP", "EUR"]],
    ["IT", ["EUR", "GBP"]],
  ])("shows the configured funding currencies for %s", (iso2, currencies) => {
    expect(MARKETING_COUNTRIES.find((country) => country.iso2 === iso2)?.payIn).toEqual(currencies);
  });

  it("stays aligned with the authoritative backend residence set", () => {
    const source = readFileSync(resolve(process.cwd(), "../consumer-api/modules/core/src/main/java/com/strivepay/consumer/core/PlatformCoverageService.java"), "utf8");
    const sepaRule = source.match(/SEPA_RESIDENCES=Set\.of\(([\s\S]*?)\);/)?.[1];
    expect(sepaRule).toBeDefined();
    const sepaCountries = [...sepaRule!.matchAll(/"([A-Z]{2})"/g)].map((match) => match[1]);
    expect(MARKETING_COUNTRIES.map((country) => country.iso2).sort()).toEqual([...sepaCountries, "NG", "GB", "US"].sort());
    for (const iso2 of sepaCountries) {
      expect(MARKETING_COUNTRIES.find((country) => country.iso2 === iso2)?.payIn, iso2).toEqual(["EUR", "GBP"]);
    }
  });
});

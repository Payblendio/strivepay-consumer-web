import {expect,it} from "vitest";
import {isValidIban,normalizeIban} from "./iban";

it("accepts the supplied German IBAN with display spacing or lowercase",()=>{
  const displayed="de89 3704 0044 0532 0130 00";
  expect(normalizeIban(displayed)).toBe("DE89370400440532013000");
  expect(isValidIban(displayed)).toBe(true);
});
it.each(["DE21300700100628341502","DE8937040044053201300","DE893704004405320130000","DE89-3704-0044-0532-0130-00",""])("rejects an invalid IBAN: %s",value=>expect(isValidIban(value)).toBe(false));

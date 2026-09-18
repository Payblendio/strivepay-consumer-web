import {describe,expect,it} from "vitest";
import {evmToTronAddress,isEvmReceivingAddress} from "./tron-address";

describe("Tron address conversion",()=>{
  it("converts an EVM key to its Tron Base58Check form",async()=>{
    await expect(evmToTronAddress("0x0000000000000000000000000000000000000000")).resolves.toBe("T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb");
  });

  it("preserves valid Tron addresses and rejects unrelated values",async()=>{
    const tron="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb";
    await expect(evmToTronAddress(tron)).resolves.toBe(tron);
    await expect(evmToTronAddress("not-an-address")).resolves.toBeNull();
    expect(isEvmReceivingAddress("0x0000000000000000000000000000000000000000")).toBe(true);
  });
});

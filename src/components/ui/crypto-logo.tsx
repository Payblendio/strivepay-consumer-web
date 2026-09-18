import Image from "next/image";

export const SUPPORTED_CRYPTO_LOGOS = ["aave","ada","axs","babydoge","bch","bnb","btc","cake","dash","doge","dot","eth","fil","floki","link","ltc","matic","one","qdx","shib","sol","trx","usdc","usdt","xlm","xrp","xtz"] as const;
export type CryptoLogoCode = typeof SUPPORTED_CRYPTO_LOGOS[number];

export function CryptoLogo({ code, size = 38 }: { code: CryptoLogoCode; size?: number }) {
  return <span className="crypto-logo" style={{ width: size, height: size }}><Image src={`/branding/crypto/${code}.svg`} width={size} height={size} style={{ width: size, height: size }} alt={`${code.toUpperCase()} logo`} /></span>;
}

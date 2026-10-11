import { p256 } from "@noble/curves/nist.js";

const b64url = (b: Uint8Array) => {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

let cache: { publicKey: string; privateKey: string } | null = null;

/**
 * Deriva o par VAPID (P-256) a partir do segredo VAPID_SEED guardado no backend.
 * A chave privada nunca aparece no código nem no navegador; só a pública é exposta.
 */
export async function getVapidKeys() {
  if (cache) return cache;
  const seed = process.env["VAPID_SEED"];
  if (!seed || seed.length < 32) throw new Error("VAPID_SEED não configurado.");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`vapid-v1:${seed}`)));
  // Reduz para um escalar válido em [1, n-1]
  const n = p256.Point.CURVE().n;
  let d = 0n;
  for (const x of digest) d = (d << 8n) | BigInt(x);
  d = (d % (n - 1n)) + 1n;
  const priv = new Uint8Array(32);
  for (let i = 31, v = d; i >= 0; i--, v >>= 8n) priv[i] = Number(v & 0xffn);
  const pub = p256.getPublicKey(priv, false); // 65 bytes, não comprimida
  cache = { publicKey: b64url(pub), privateKey: b64url(priv) };
  return cache;
}

/** Authenticate the original bytes before parsing, using the official SDK verifier. */
export function studentEmailEventVerifier(Verifier: new (secret: string) => {
  verify: (raw: string, headers: Record<string,string>) => unknown;
}) {
  return (secret: string, raw: string, headers: Record<string,string>): unknown => {
    new Verifier(secret).verify(raw,headers);
    return JSON.parse(raw);
  };
}

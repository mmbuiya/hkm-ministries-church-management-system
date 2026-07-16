export async function hashPin(memberId: string, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  // Salt with memberId to prevent rainbow table attacks on simple 6-digit PINs
  const data = encoder.encode(memberId + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

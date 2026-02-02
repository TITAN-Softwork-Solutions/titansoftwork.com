export async function loadBreaches() {
  const res = await fetch("/data/breaches.json");
  if (!res.ok) throw new Error(`Failed to load breaches.json: ${res.status}`);
  return await res.json();
}
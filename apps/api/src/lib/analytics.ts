/**
 * Server-side Plausible event tracking via Events API
 * https://plausible.io/docs/events-api
 */

const PLAUSIBLE_DOMAIN = 'drivemem.cloud';
const PLAUSIBLE_URL = 'https://plausible.io/api/event';

export async function trackServerEvent(
  name: string,
  props?: Record<string, string | number>,
): Promise<void> {
  try {
    await fetch(PLAUSIBLE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'DriveMem-API/1.0' },
      body: JSON.stringify({
        domain: PLAUSIBLE_DOMAIN,
        name,
        url: `https://${PLAUSIBLE_DOMAIN}/api`,
        props,
      }),
    });
  } catch {
    // Fire-and-forget: don't let analytics failures break business logic
  }
}

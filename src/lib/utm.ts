const UTM_KEY = 'metricon_utm';

interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/** Read UTM params from current URL and save to localStorage (overwrites only if present) */
export function captureUTM(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const source = params.get('utm_source');
  if (!source) return; // no UTM in URL — keep whatever was saved before

  const data: UTMData = { utm_source: source };
  const medium = params.get('utm_medium');
  const campaign = params.get('utm_campaign');
  if (medium) data.utm_medium = medium;
  if (campaign) data.utm_campaign = campaign;

  localStorage.setItem(UTM_KEY, JSON.stringify(data));
}

/** Get saved UTM data (or empty object) */
export function getUTM(): UTMData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Clear saved UTM (call after successful registration) */
export function clearUTM(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(UTM_KEY);
}

export function openAIKey(env = {}) {
  const apiKey = typeof process !== 'undefined' ? process.env.OPENAI_API_KEY?.trim() : undefined;
  return typeof env.OPENAI_API_KEY === 'string' ? env.OPENAI_API_KEY.trim() : apiKey || '';
}

export function safeDetail(value, apiKey = '') {
  let detail = typeof value === 'string' ? value : '';
  if (apiKey) detail = detail.split(apiKey).join('[clé masquée]');
  return detail.replace(/sk-[A-Za-z0-9_*.-]+/g, '[clé masquée]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [masqué]')
    .replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 1000);
}

export class OpenAIError extends Error {
  constructor(message, statusHttp = null, code = null) {
    super(message);
    this.statusHttp = statusHttp;
    this.code = code;
  }
}

export async function responseError(response, apiKey) {
  const errData = await response.json().catch(() => null);
  const code = safeDetail(errData?.error?.code, apiKey) || null;
  const message = safeDetail(errData?.error?.message, apiKey) || code || (response.status===429 ? 'Quota ou limite de débit de l’API atteint, sans détail JSON exploitable.' : 'Réponse API sans détail JSON exploitable.');
  return new OpenAIError(message, response.status, code);
}

export function diagnostic(error, apiKey) {
  return {
    statusHttp: Number.isInteger(error?.statusHttp) ? error.statusHttp : null,
    code: safeDetail(error?.code, apiKey) || null,
    detailErreur: safeDetail(error?.message, apiKey) || 'Erreur réseau sans réponse HTTP.',
  };
}

import { openAIKey, responseError, diagnostic } from './openai-diagnostic.js';
export { openAIKey } from './openai-diagnostic.js';

// Called only after owner authentication in server/api.js.
export async function handleStatusIA(request, env, { fetcher = fetch } = {}) {
  const headers = {'cache-control':'private, no-store','x-content-type-options':'nosniff'};
  if (request.method !== 'GET') return Response.json({error:'Méthode non prise en charge.'}, {status:405, headers:{...headers, allow:'GET'}});
  const apiKey = openAIKey(env);
  const base = {configured:!!apiKey, openaiConfigured:!!apiKey, mode:'auto', provider:apiKey?'openai':'local', model:apiKey?'gpt-4o-mini':null, fallback:'local_server'};
  if (!apiKey) return Response.json({...base, connexionReelle:false, statusHttp:null, detailErreur:'Clé OpenAI absente.', code:'missing_api_key', verification:'not_configured'}, {headers});
  try {
    const response = await fetcher('https://api.openai.com/v1/models', {
      method:'GET', headers:{authorization:'Bearer '+apiKey},
      redirect:'manual', signal:AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
    });
    if (!response.ok) throw await responseError(response, apiKey);
    await response.body?.cancel();
    return Response.json({...base, connexionReelle:true, statusHttp:response.status, detailErreur:null, code:null, verification:'connection_verified', porteeVerification:'Authentification API uniquement ; quota et génération gpt-4o-mini à vérifier par une analyse.'}, {headers});
  } catch (error) {
    return Response.json({...base, connexionReelle:false, ...diagnostic(error, apiKey), verification:'failed'}, {headers});
  }
}

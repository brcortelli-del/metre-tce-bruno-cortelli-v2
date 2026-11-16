import {servePortableNodeApi} from './portable-api.js';
import { handleApi } from './api.js';

// Node compatibility bridge. The hosting gateway must supply a verified Sites
// Request and server bindings; raw HTTP identity headers are never trusted here.
export async function serveNodeApi(req, res) {
  if(!req.sitesRequest&&(process.env.VERCEL||process.env.METRE_PORTABLE==='1'))return servePortableNodeApi(req,res);
  if (!(req.sitesRequest instanceof Request) || !req.sitesEnv?.DB) {
    res.setHeader('cache-control', 'no-store');
    return res.status(503).json({error:'Passerelle Sites authentifiée et bindings serveur requis.'});
  }
  const response = await handleApi(req.sitesRequest, req.sitesEnv);
  for (const [name, value] of response.headers) res.setHeader(name, value);
  return res.status(response.status).send(await response.text());
}

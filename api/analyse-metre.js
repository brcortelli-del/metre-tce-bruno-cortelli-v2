import { serveNodeApi } from '../server/node-api-adapter.js';

export default async function handler(req, res) {
  return serveNodeApi(req, res);
}

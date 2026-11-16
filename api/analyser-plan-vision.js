import {serveNodeApi} from '../server/node-api-adapter.js';
export const config={api:{bodyParser:{sizeLimit:'12mb'}}};
export default async function handler(req,res){return serveNodeApi(req,res);}

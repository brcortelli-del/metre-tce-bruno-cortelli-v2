import {servePortableNodeApi} from '../server/portable-api.js';
export default async function handler(req,res){if(!process.env.VERCEL&&process.env.METRE_PORTABLE!=='1')return res.status(404).json({error:'Route autonome non activée.'});return servePortableNodeApi(req,res);}

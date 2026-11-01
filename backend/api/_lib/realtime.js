import pg from 'pg';
import { withClient } from './db.js';
import { requireUser } from './auth.js';
import { loadAdmin, permits } from './admin-auth.js';

const clients = new Set();
let listener, reconnect, heartbeat;
const silentResponse = () => ({ status(){return this;},json(){return this;},clearCookie(){return this;} });
export async function realtimeIdentity(req,res,audience) {
  if(audience==='admin'){
    const admin=await loadAdmin(req);
    if(!admin){res.status(401).json({error:'Non authentifié.'});return null;}
    return {audience,id:admin.id,perms:admin.perms};
  }
  const user=await requireUser(req,res);
  return user?{audience,id:user.userId,perms:[]}:null;
}
export function canReadRealtime(identity,resource){return identity.audience==='user'||resource==='notifications'||permits(identity.perms,'subscriptions.read');}
async function drain(client){
  if(client.closed)return;
  if(client.busy){client.pending=true;return;}
  client.busy=true;
  try{
    const current=await realtimeIdentity(client.req,silentResponse(),client.identity.audience);
    if(!current||current.id!==client.identity.id){client.res.write('event: session-ended\ndata: {}\n\n');client.close();return;}client.identity=current;
    const rows=await withClient(async c=>(await c.query("select id::text,audience,recipient_id,resource,record_id from realtime_events where id>$1 order by id limit 200",[client.cursor])).rows);
    for(const row of rows){
      client.cursor=row.id;
      if(row.audience!==client.identity.audience||row.recipient_id&&row.recipient_id!==client.identity.id||!canReadRealtime(client.identity,row.resource))continue;
      if(client.res.writableLength>262144){client.close();return;}
      client.res.write(`id: ${row.id}\nevent: change\ndata: ${JSON.stringify({resource:row.resource,id:row.record_id})}\n\n`);
    }
    // Advance the reconnect cursor even across events invisible to this account.
    if(rows.length)client.res.write(`id: ${client.cursor}\nevent: cursor\ndata: {}\n\n`);
    if(rows.length===200)setImmediate(()=>drain(client));
  }catch{client.close();}finally{client.busy=false;if(client.pending){client.pending=false;setImmediate(()=>drain(client));}}
}
function wake(){for(const client of clients)drain(client);}
export function startRealtime(){
  if(listener||reconnect)return;
  const connect=async()=>{
    reconnect=null;
    const connection=new pg.Client({connectionString:process.env.DATABASE_URL});listener=connection;
    let lost=false;
    const retry=()=>{if(lost)return;lost=true;listener=null;connection.end().catch(()=>{});reconnect=setTimeout(connect,3000);reconnect.unref();};
    connection.on('error',retry);connection.on('end',retry);connection.on('notification',wake);
    try{await connection.connect();await connection.query('LISTEN applika_realtime');wake();}catch{retry();}
  };
  connect();
  heartbeat=setInterval(async()=>{
    for(const client of clients){
      if(client.checking)continue;client.checking=true;
      try{const current=await realtimeIdentity(client.req,silentResponse(),client.identity.audience);if(!current||current.id!==client.identity.id){client.res.write('event: session-ended\ndata: {}\n\n');client.close();continue;}client.identity=current;client.res.write(': heartbeat\n\n');await drain(client);}catch{client.close();}finally{client.checking=false;}
    }
  },15000);heartbeat.unref();
}
export async function stopRealtime(){
  clearTimeout(reconnect);clearInterval(heartbeat);for(const client of clients)client.close();
  const connection=listener;listener=null;if(connection){connection.removeAllListeners();await connection.end();}
}
export function realtimeHandler(audience){return async(req,res,next)=>{try{
  const identity=await realtimeIdentity(req,res,audience);if(!identity)return;
  if([...clients].filter(c=>c.identity.id===identity.id&&c.identity.audience===audience).length>=5||clients.size>=500)return res.status(429).json({error:'Trop de connexions temps réel.'});
  const bounds=await withClient(async c=>(await c.query('select coalesce(min(id),0)::text as min,coalesce(max(id),0)::text as max from realtime_events')).rows[0]);
  const supplied=String(req.headers['last-event-id']||req.query.since||'');
  let cursor=/^\d{1,19}$/.test(supplied)?supplied:bounds.max;
  const reset=BigInt(cursor)<BigInt(bounds.min)||BigInt(cursor)>BigInt(bounds.max);
  if(reset)cursor=bounds.max;
  res.status(200).set({'Content-Type':'text/event-stream','Cache-Control':'private, no-store','X-Accel-Buffering':'no','Connection':'keep-alive'});res.flushHeaders();
  const client={req,res,identity,cursor,busy:false,closed:false,checking:false,close(){if(this.closed)return;this.closed=true;clients.delete(this);res.end();}};
  clients.add(client);req.on('close',()=>client.close());
  res.write(`retry: 3000\nevent: ready\ndata: ${JSON.stringify({reset})}\n\n`);
  await drain(client);
}catch(error){next(error);}};}

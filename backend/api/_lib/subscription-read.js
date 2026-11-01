import crypto from 'node:crypto';
import { migrationIssues, periodState, resolveSubscriptions } from './subscription-state.js';
export async function subscriptionRows(c,userId) {
  return (await c.query('select s.*, p.name as plan_name, p.period from subscriptions s join plans p on p.code=s.plan_code where s.user_id=$1 order by s.started_at, s.id',[userId])).rows;
}
export async function subscriptionContext(c,userId) {
  const user=(await c.query('select id,name,email,status from users where id=$1',[userId])).rows[0];
  if(!user){ const e=new Error('Utilisateur introuvable.');e.status=404;throw e; }
  const rows=await subscriptionRows(c,userId);
  const plans=(await c.query('select code,name,period,trial_days,audience,archived,visible,country from plans order by code')).rows;
  const features=(await c.query('select pf.*, f.label from plan_features pf join features f on f.code=pf.feature_code order by pf.plan_code,pf.feature_code')).rows;
  const overrides=(await c.query('select * from entitlement_overrides where user_id=$1 order by created_at,id',[userId])).rows;
  const settings=(await c.query("select key,value from app_settings where key in ('subscriptions_enforced','subscription_timezone') order by key")).rows;
  const usage=(await c.query(`select (select count(*)::int from pets where user_id=$1) as animals,
    (select count(*)::int from photos where user_id=$1) as photos_count,
    (select coalesce(sum(byte_size),0)::float8/1048576 from photos where user_id=$1) as photos_storage_mb,
    (select count(*)::int from household_members where owner_id=$1) as household_members`,[userId])).rows[0];
  const revision=crypto.createHash('sha256').update(JSON.stringify({user,rows,plans,features,overrides,settings,usage})).digest('hex');
  return {user,rows,plans,features,overrides,usage,revision,timezone:settings.find((s)=>s.key==='subscription_timezone')?.value||'UTC'};
}
export function describeSubscriptions(rows,now=Date.now()) {
  const state=resolveSubscriptions(rows,now);
  const describe=(row)=>row?{...row,state:periodState(row,now)}:null;
  return {effective:describe(state.effective),tracked:describe(state.tracked),upcoming:state.upcoming.map(describe),nextTransition:state.nextTransition,issues:migrationIssues(rows,now)};
}
export async function listSubscriptions(c,{q='',view='encours',days=7,plan=''}={}) {
  const now=Date.now(); const rows=(await c.query('select s.*,p.name as plan_name,p.period,u.name as user_name,u.email as user_email from subscriptions s join plans p on p.code=s.plan_code join users u on u.id=s.user_id order by s.started_at desc,s.id')).rows;
  const byUser=new Map(); for(const row of rows){ if(!byUser.has(row.user_id))byUser.set(row.user_id,[]);byUser.get(row.user_id).push(row); }
  const search=String(q).toLocaleLowerCase(); const base=rows.filter((r)=>(!search||`${r.user_name||''} ${r.user_email}`.toLocaleLowerCase().includes(search))&&(!plan||r.plan_code===plan));
  const matches=(r,key)=>{
    const state=periodState(r,now);
    if(key==='all')return true;
    if(key==='encours')return ['actif','essai'].includes(state);
    if(key==='soon')return ['actif','essai'].includes(state)&&r.ends_at&&new Date(r.ends_at).getTime()<=now+Math.min(30,Math.max(1,Number(days)||7))*86400000;
    if(key==='history')return ['expire','termine','remplace','annule'].includes(state);
    return state===key;
  };
  const counts=Object.fromEntries(['all','encours','soon','essai','expire','suspendu','prevu','history'].map((key)=>[key,base.filter((r)=>matches(r,key)).length]));
  return {counts,rows:base.filter((r)=>matches(r,view)).map((r)=>{const s=describeSubscriptions(byUser.get(r.user_id),now);return {...r,state:periodState(r,now),effectivePlan:s.effective?.plan_name||'Gratuit',upcoming:s.upcoming[0]||null,needsReview:!!(s.issues.overlaps.length||s.issues.invalidDates.length||s.issues.ambiguous.length),daysLeft:r.ends_at?Math.max(0,Math.ceil((new Date(r.ends_at)-now)/86400000)):null};})};
}

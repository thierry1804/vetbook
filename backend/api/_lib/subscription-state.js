export const RESERVED_STATES = ['actif', 'essai', 'suspendu', 'en_retard'];
export const isReserved = (row) => RESERVED_STATES.includes(row.status);
export const instant = (value) => value == null ? Infinity : new Date(value).getTime();
export function periodState(row, now = Date.now()) {
  if (['resilie', 'termine', 'remplace', 'annule'].includes(row.status)) return row.status === 'resilie' ? 'termine' : row.status;
  if (!isReserved(row)) return 'arevoir';
  if (instant(row.ends_at) <= now) return row.replaced_by ? 'remplace' : 'expire';
  if (instant(row.started_at) > now) return 'prevu';
  if (row.status === 'suspendu' || row.status === 'en_retard') return 'suspendu';
  return row.is_trial || row.status === 'essai' ? 'essai' : 'actif';
}
export function resolveSubscriptions(rows, now = Date.now()) {
  const sorted = [...rows].sort((a, b) => instant(b.started_at) - instant(a.started_at) || String(b.id).localeCompare(String(a.id)));
  const effective = sorted.find((r) => ['actif','essai'].includes(r.status) && instant(r.started_at) <= now && instant(r.ends_at) > now) || null;
  const tracked = sorted.find((r) => instant(r.started_at) <= now) || sorted[0] || null;
  const upcoming = sorted.filter((r) => isReserved(r) && instant(r.started_at) > now).sort((a,b) => instant(a.started_at)-instant(b.started_at));
  const transitions = rows.flatMap((r) => isReserved(r) ? [instant(r.started_at), instant(r.ends_at)].filter((date) => Number.isFinite(date) && date > now) : []);
  return { effective, tracked, upcoming, nextTransition: transitions.length ? new Date(Math.min(...transitions)).toISOString() : null };
}
export function overlappingPeriods(rows) {
  const active = rows.filter(isReserved); const pairs = [];
  for (let i=0;i<active.length;i++) for (let j=i+1;j<active.length;j++) {
    if (instant(active[i].started_at) < instant(active[j].ends_at) && instant(active[j].started_at) < instant(active[i].ends_at)) pairs.push([String(active[i].id),String(active[j].id)].sort().join(':'));
  }
  return pairs.sort();
}
export function migrationIssues(rows, now = Date.now()) {
  const overlaps = overlappingPeriods(rows);
  return { overlaps, invalidDates: rows.filter((r) => instant(r.ends_at) <= instant(r.started_at)).map((r) => r.id),
    unlimited: rows.filter((r) => isReserved(r) && !r.ends_at).map((r) => r.id),
    ambiguous: rows.filter((r) => r.status === 'en_retard' || !['actif','essai','suspendu','resilie','termine','remplace','annule'].includes(r.status)).map((r) => r.id),
    legacyFuture: rows.filter((r) => !r.workflow_version && ['actif','essai'].includes(r.status) && instant(r.started_at)>now && instant(r.ends_at)>now).map((r)=>r.id) };
}
export function zonedParts(value, zone = 'UTC') {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).filter((p)=>p.type!=='literal').map((p)=>[p.type,Number(p.value)]));
}
const wall = (p) => Date.UTC(p.year,p.month-1,p.day,p.hour||0,p.minute||0,p.second||0);
export function localInstant(text, zone = 'UTC') {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text || '');
  if (!match) throw Object.assign(new Error('Date et heure locales invalides.'), {status:400});
  const p={year:+match[1],month:+match[2],day:+match[3],hour:+match[4],minute:+match[5],second:+(match[6]||0)};
  if (p.month<1||p.month>12||p.day<1||p.day>new Date(Date.UTC(p.year,p.month,0)).getUTCDate()||p.hour>23||p.minute>59||p.second>59) throw Object.assign(new Error('Date et heure locales invalides.'), {status:400});
  const target=wall(p); let value=target; const seen=[];
  for(let i=0;i<6;i++){ const delta=target-wall(zonedParts(value,zone)); if(!delta) return new Date(value).toISOString(); seen.push(value); value+=delta; }
  // DST gap: take the first representable time after the missing local time.
  const later=seen.filter((v)=>wall(zonedParts(v,zone))>=target).sort((a,b)=>a-b)[0];
  if(later===undefined) throw Object.assign(new Error('Horaire inexistant dans ce fuseau.'), {status:400});
  return new Date(later).toISOString();
}
export function addCalendar(value, amount, unit, anchorDay, zone='UTC') {
  if (!Number.isInteger(amount)||amount<1||amount>(unit==='days'?3650:120)) throw Object.assign(new Error('Durée attendue : un entier dans les limites proposées.'), {status:400});
  const p=zonedParts(value,zone); const d=new Date(wall(p));
  if(unit==='days') d.setUTCDate(d.getUTCDate()+amount);
  else { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+amount); d.setUTCDate(Math.min(anchorDay||p.day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate())); }
  const pad=(n)=>String(n).padStart(2,'0');
  return localInstant(`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`,zone);
}

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Checkbox, Descriptions, Empty, Form, Input, InputNumber, Modal, Select, Space, Steps, Table, Tabs, Tag, Typography, message } from 'antd';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, permits } from './api';
import { useAuth } from './auth';
import { PageHeader } from './ui';
import { QueryFeedback } from './QueryFeedback';
import { ManagedTable } from './ManagedTable';
import { useUnsavedChanges } from './interaction';
import { download, toCsv } from './csv';

export const SUB_STATES:Record<string,string>={arevoir:'À revoir',actif:'Actif',essai:'Essai',prevu:'Prévu',suspendu:'Suspendu',expire:'Expiré',termine:'Terminé',remplace:'Remplacé',annule:'Annulé'};
const ACTIONS:Record<string,string>={assign:'Attribuer',trial:'Démarrer un essai',renew:'Renouveler',change:'Changer de formule',suspend:'Suspendre',resume:'Reprendre',end:'Mettre fin maintenant',cancel:'Annuler une activation prévue',correct:'Corriger les dates'};
const CONFIRM:Record<string,string>={assign:'Confirmer l’attribution',trial:'Confirmer l’essai',renew:'Confirmer le renouvellement',change:'Confirmer le changement',suspend:'Confirmer la suspension',resume:'Confirmer la reprise',end:'Confirmer la fin immédiate',cancel:'Confirmer l’annulation',correct:'Confirmer la correction'};
const RIGHTS:Record<string,string>={assign:'subscriptions.manage',trial:'subscriptions.manage',renew:'subscriptions.manage',change:'subscriptions.manage',suspend:'subscriptions.control',resume:'subscriptions.control',end:'subscriptions.control',cancel:'subscriptions.control',correct:'subscriptions.advanced'};
export const subDate=(value:any,zone='UTC')=>value?new Date(value).toLocaleString('fr-FR',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}):'Sans échéance';
const localField=(value:any,zone:string)=>{if(!value)return '';const parts=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;};
const useDossier=(userId?:string)=>useQuery({queryKey:['subscription',userId],enabled:!!userId,queryFn:async()=>(await api(`/subscription-users/${userId}`)).json});
const State=({value}:{value:string})=><Tag color={value==='actif'?'success':value==='expire'||value==='suspendu'?'warning':undefined}>{SUB_STATES[value]||value}</Tag>;
const useRefresh=()=>{const qc=useQueryClient();return()=>{for(const key of ['subscription','subscription-periods','subscription-requests','subscription-review','work-queue','one'])qc.invalidateQueries({queryKey:[key]});};};

export function SubscriptionSummary({data,onAction}:{data:any;onAction?:(action:string,id?:string)=>void}) {
  const {permissions}=useAuth(); const effective=data.effective;
  return <section className="admin-panel">
    <Typography.Title level={5} style={{marginTop:0}}>Accès actuel : {effective?.plan_name||'Gratuit'}</Typography.Title>
    {effective?<Space wrap><State value={effective.state}/><span>{subDate(effective.started_at,data.timezone)} → {subDate(effective.ends_at,data.timezone)}</span></Space>:<Typography.Paragraph>Accès de remplacement Gratuit. {data.tracked?`${data.tracked.plan_name} : ${SUB_STATES[data.tracked.state]||data.tracked.state}.`:''}</Typography.Paragraph>}
    <Typography.Paragraph type="secondary">Fuseau : {data.timezone}. {data.upcoming?.length?`Prochaine activation : ${data.upcoming[0].plan_name}, le ${subDate(data.upcoming[0].started_at,data.timezone)}.`:'Aucune activation future.'}</Typography.Paragraph>
    {(data.issues?.overlaps?.length||data.issues?.invalidDates?.length||data.issues?.ambiguous?.length)?<Alert type="warning" showIcon message="Ce dossier nécessite une revue des périodes existantes." style={{marginBottom:12}}/>:null}
    {data.issues?.unlimited?.length?<Typography.Paragraph type="secondary">Ce dossier contient un accès sans échéance, conservé tel quel.</Typography.Paragraph>:null}
    <Space wrap>
      {onAction&&Object.keys(ACTIONS).filter((action)=>permits(permissions,RIGHTS[action])).filter((action)=>{
        const row=data.effective||data.tracked;
        if(['assign','trial'].includes(action))return !data.effective&&(!row||['expire','termine','annule','remplace'].includes(row.state));
        if(action==='change')return row&&['actif','essai','suspendu'].includes(row.state);
        if(action==='renew')return row&&row.ends_at&&!row.is_trial&&['actif','expire'].includes(row.state);
        if(action==='suspend')return row&&['actif','essai'].includes(row.state);
        if(action==='resume')return row?.state==='suspendu';
        if(action==='end')return row&&['actif','essai','suspendu'].includes(row.state);
        if(action==='cancel')return data.upcoming?.length;
        return data.rows?.length;
      }).map((action)=><Button key={action} danger={action==='end'} onClick={()=>onAction(action,action==='cancel'?data.upcoming[0]?.id:(data.effective||data.tracked)?.id)}>{ACTIONS[action]}</Button>)}
    </Space>
  </section>;
}
export function UserSubscriptionCard({userId}:{userId:string}) {
  const {permissions}=useAuth();const enabled=permits(permissions,'subscriptions.read');const data=useQuery({queryKey:['subscription',userId],enabled,queryFn:async()=>(await api(`/subscription-users/${userId}`)).json});
  const [action,setAction]=useState<{action:string;id?:string}|null>(null);const refresh=useRefresh();
  if(!enabled)return null;
  return <><QueryFeedback loading={data.isLoading} error={data.error} retry={data.refetch}/>{data.data?<><SubscriptionSummary data={data.data} onAction={(name,id)=>setAction({action:name,id})}/><Link to={`/subscriptions/users/${userId}`}>Voir les périodes et l’historique</Link></>:null}{action?<SubscriptionWizard userId={userId} initialAction={action.action} targetId={action.id} onClose={()=>setAction(null)} onDone={refresh}/>:null}</>;
}

export function SubscriptionWizard({userId:fixedUser,initialAction='assign',targetId,request,onClose,onDone}:{userId?:string;initialAction?:string;targetId?:string;request?:any;onClose:()=>void;onDone:()=>void}) {
  const {permissions}=useAuth();const [userId,setUserId]=useState(fixedUser||'');const [search,setSearch]=useState('');const [action,setAction]=useState(initialAction);
  const [target,setTarget]=useState(targetId||'');const [planCode,setPlanCode]=useState(request?.plan_code||'');const [step,setStep]=useState(fixedUser?1:0);
  const [fields,setFields]=useState<any>({paymentReference:request?.payment_reference||'',periods:1,when:'now',reason:'',exceptionReason:'',futureDisposition:'',startLocal:'',unlimited:false,confirmUnlimited:false});
  const [preview,setPreview]=useState<any>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [dirty,setDirty]=useState(false);const [operationId]=useState(()=>crypto.randomUUID());
  const guard=useUnsavedChanges(dirty);const dossier=useDossier(userId);
  const users=useQuery({queryKey:['subscription-users',search],enabled:!fixedUser&&search.trim().length>=2,queryFn:async()=>(await api('/subscription-users?'+new URLSearchParams({q:search}))).json});
  const set=(key:string,value:any)=>{setFields((old:any)=>({...old,[key]:value}));setDirty(true);setPreview(null);setError('');};
  useEffect(()=>{const data=dossier.data;if(!data)return;if(!target)setTarget((data.effective||data.tracked)?.id||'');if(!planCode)setPlanCode((data.effective||data.tracked)?.plan_code||data.plans.find((p:any)=>p.code==='premium'&&!p.archived)?.code||data.plans.find((p:any)=>p.code!=='gratuit'&&!p.archived)?.code||'');if(request?.kind==='assign'&&(data.effective||data.tracked?.state==='suspendu'))setAction('change');},[!!dossier.data,userId]);
  useEffect(()=>{const d=dossier.data;if(!d)return;const row=d.rows.find((r:any)=>r.id===target);setFields((old:any)=>({...old,...(action==='correct'&&row?{correctStartLocal:localField(row.started_at,d.timezone),correctEndLocal:localField(row.ends_at,d.timezone)}:{}),...(request?.desired_start&&new Date(request.desired_start).getTime()>Date.now()&&['assign','trial'].includes(action)?{startLocal:localField(request.desired_start,d.timezone)}:{})}));},[target,action,!!dossier.data]);
  const advanced=permits(permissions,'subscriptions.advanced');const data=dossier.data;
  const plan=data?.plans.find((p:any)=>p.code===planCode);const family=planCode.replace(/_annuel$/,'');
  const available=(data?.plans||[]).filter((p:any)=>!p.archived&&p.code!=='gratuit');
  const families=[...new Map(available.map((p:any)=>[p.code.replace(/_annuel$/,''),p.name.replace(/ \(annuel\)$/,'')])).entries()];
  const variants=available.filter((p:any)=>p.code.replace(/_annuel$/,'')===family);
  const close=()=>{if(dirty)Modal.confirm({title:'Fermer sans enregistrer ?',content:'Les saisies de ce formulaire seront perdues.',okText:'Fermer',cancelText:'Continuer',onOk:()=>{guard.allowNavigation();onClose();}});else onClose();};
  const calculate=async()=>{
    setError('');if(fields.reason.trim().length<5){setError('Un motif de 5 caractères minimum est requis.');document.getElementById('subscription-reason')?.focus();return;}
    setBusy(true);try{const response=await api(`/subscription-users/${userId}/preview`,{method:'POST',body:{...fields,action,subscriptionId:target,planCode,requestId:request?.id}});setPreview(response.json);}catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const confirm=async()=>{setBusy(true);setError('');try{await api(`/subscription-users/${userId}/commit`,{method:'POST',body:{token:preview.token,operationId}});guard.allowNavigation();message.success('Abonnement mis à jour');onDone();onClose();}catch(e:any){setError(e.message);if(e.status===409){setPreview(null);dossier.refetch();}}finally{setBusy(false);}};
  const featureChanges=preview?Object.keys(preview.featuresAfter).filter((key)=>JSON.stringify(preview.featuresBefore[key])!==JSON.stringify(preview.featuresAfter[key])).map((key)=>({key,label:preview.labels?.[key]||key,before:preview.featuresBefore[key],after:preview.featuresAfter[key],used:preview.usage[key]})):[];
  const feature=(f:any)=>!f?.enabled?'Non inclus':f.quota==null?'Inclus / sans quota':String(f.quota);
  const targetRow=data?.rows.find((r:any)=>r.id===target);
  return <>{guard.dialog}<Modal open width="min(1000px, calc(100vw - 32px))" title="Gérer l’abonnement" onCancel={()=>{if(!busy)close();}}
    footer={<Space wrap><Button disabled={busy} onClick={close}>Annuler</Button>{step>0?<Button disabled={busy} onClick={()=>{setStep(step-1);setPreview(null);}}>Retour</Button>:null}{step<2?<Button type="primary" disabled={!userId||!data||!!dossier.error} onClick={()=>setStep(step+1)}>Continuer</Button>:preview?<Button type="primary" loading={busy} onClick={confirm}>{CONFIRM[action]}</Button>:<Button type="primary" loading={busy} onClick={calculate}>Calculer l’aperçu</Button>}</Space>}>
    <Steps size="small" current={step} style={{marginBottom:20}} items={[{title:'Utilisateur'},{title:'Action et durée'},{title:'Vérification'}]}/>
    {error?<Alert type="error" showIcon message={error} style={{marginBottom:16}}/>:null}
    {step===0?<Form layout="vertical"><Form.Item label="Rechercher un utilisateur" required><Select showSearch filterOption={false} placeholder="Nom ou e-mail (2 caractères min.)" loading={users.isFetching} onSearch={setSearch} value={userId||undefined} disabled={!!fixedUser} onChange={(value)=>{setUserId(value);setTarget('');setPlanCode('');setDirty(true);setPreview(null);}} options={(fixedUser&&data?[data.user]:users.data||[]).map((u:any)=>({value:u.id,label:`${u.name||''} — ${u.email}`}))}/></Form.Item><QueryFeedback error={users.error} retry={users.refetch}/></Form>:null}
    <QueryFeedback loading={dossier.isLoading&&!!userId} error={dossier.error} retry={dossier.refetch}/>
    {data?<>
      <Typography.Paragraph><strong>{data.user.name||data.user.email}</strong> · Accès actuel : {data.effective?.plan_name||'Gratuit'} · Fuseau : {data.timezone}</Typography.Paragraph>
      {step===1?<Form layout="vertical">
        <Form.Item label="Action"><Select value={action} disabled={request?.kind==='renew'} options={Object.entries(ACTIONS).filter(([key])=>permits(permissions,RIGHTS[key])).map(([value,label])=>({value,label}))} onChange={(value)=>{setAction(value);setDirty(true);setPreview(null);}}/></Form.Item>
        {!['assign','trial'].includes(action)?<Form.Item label="Période concernée" required><Select value={target||undefined} onChange={(value)=>{setTarget(value);setDirty(true);setPreview(null);}} options={data.rows.map((r:any)=>({value:r.id,label:`${r.plan_name} — ${SUB_STATES[r.state]} — ${subDate(r.started_at,data.timezone)} → ${subDate(r.ends_at,data.timezone)}`}))}/></Form.Item>:null}
        {['assign','trial','change'].includes(action)?<>
          <Form.Item label="Offre" required><Select value={family||undefined} options={families.map(([value,label])=>({value,label}))} onChange={(value)=>{setPlanCode(available.find((p:any)=>p.code===value)?.code||available.find((p:any)=>p.code.replace(/_annuel$/,'')===value)?.code);setDirty(true);setPreview(null);}}/></Form.Item>
          <Form.Item label="Variante" required><Select value={planCode||undefined} options={variants.map((p:any)=>({value:p.code,label:p.period==='annuel'?'Annuelle':p.period==='mensuel'?'Mensuelle':'Durée personnalisée'}))} onChange={(value)=>{setPlanCode(value);setDirty(true);setPreview(null);}}/></Form.Item>
        </>:null}
        {action==='change'?<Form.Item label="Prise d’effet"><Select value={fields.when} onChange={(value)=>set('when',value)} options={[{value:'now',label:'Maintenant'},{value:'end',label:'À l’échéance actuelle',disabled:!targetRow?.ends_at},...(advanced?[{value:'date',label:'Date future (avancé)'}]:[])]}/></Form.Item>:null}
        {['assign','trial'].includes(action)||(action==='change'&&fields.when==='date')||(action==='renew'&&targetRow?.state==='expire')?<Form.Item label={`Début souhaité (${data.timezone})`} help="Laisser vide pour maintenant. Le serveur calcule l’instant exact dans ce fuseau."><Input type="datetime-local" value={fields.startLocal} onChange={(e)=>set('startLocal',e.target.value)}/></Form.Item>:null}
        {['assign','renew','change'].includes(action)?<>
          <Form.Item label="Nombre de périodes standards" help={action==='renew'?'Ajouté à l’échéance encore valable, sans perdre les jours restants.':plan?.period==='annuel'?'Une période = douze mois calendaires.':'Une période = un mois calendaire.'}><InputNumber min={1} max={10} value={fields.periods} disabled={fields.unlimited||!!fields.customDays} onChange={(value)=>set('periods',value)}/></Form.Item>
          {action!=='renew'?<Form.Item label="Durée personnalisée en jours (facultatif)"><InputNumber min={1} max={3650} value={fields.customDays} disabled={fields.unlimited} onChange={(value)=>set('customDays',value??undefined)}/></Form.Item>:null}
          {advanced&&action!=='renew'?<Form.Item><Checkbox checked={fields.unlimited} onChange={(e)=>set('unlimited',e.target.checked)}>Accès sans échéance (exception avancée)</Checkbox>{fields.unlimited?<Checkbox checked={fields.confirmUnlimited} onChange={(e)=>set('confirmUnlimited',e.target.checked)}>Je confirme l’absence d’échéance</Checkbox>:null}</Form.Item>:null}
        </>:null}
        {action==='trial'?<Alert type="info" message={`${plan?.trial_days||0} jours d’essai configurés. Une fin est obligatoire.`} description={`Essais déjà accordés pour cette offre : ${data.rows.filter((r:any)=>(r.is_trial||r.status==='essai')&&r.plan_code.replace(/_annuel$/,'')===family).length}. Une répétition nécessite une dérogation avancée.`}/>:null}
        {action==='correct'?<><Form.Item label={`Nouveau début (${data.timezone})`} required><Input type="datetime-local" value={fields.correctStartLocal||''} onChange={(e)=>set('correctStartLocal',e.target.value)}/></Form.Item><Form.Item label={`Nouvelle fin (${data.timezone})`}><Input type="datetime-local" value={fields.correctEndLocal||''} onChange={(e)=>set('correctEndLocal',e.target.value)}/></Form.Item><Checkbox checked={fields.confirmUnlimited} onChange={(e)=>set('confirmUnlimited',e.target.checked)}>Je confirme une éventuelle absence de fin</Checkbox></>:null}
        {request?<Form.Item label="Référence de paiement" help="Facultative : référence du règlement reçu manuellement, conservée dans le backoffice."><Input id="subscription-payment-reference" value={fields.paymentReference} maxLength={120} placeholder="Ex. MV-2026-001234" onChange={(e)=>set('paymentReference',e.target.value)}/></Form.Item>:null}
        {action==='end'&&data.upcoming.length?<Form.Item label="Activations futures" required><Select value={fields.futureDisposition||undefined} placeholder="Choix explicite requis" onChange={(value)=>set('futureDisposition',value)} options={[{value:'keep',label:'Conserver les activations prévues'},{value:'cancel',label:'Annuler aussi les activations prévues'}]}/></Form.Item>:null}
        {['suspend','resume','end','cancel'].includes(action)?<Alert type="warning" showIcon message={action==='suspend'?'La durée continue de courir. Le compte utilisateur reste inchangé.':action==='resume'?'Une période expirée ne peut pas reprendre : il faut la renouveler.':'Les données sont conservées et l’action reste dans l’historique.'}/>:null}
      </Form>:null}
      {step===2?<><Form layout="vertical"><Form.Item label="Motif de l’action (journalisé)" required help="5 caractères minimum"><Input.TextArea id="subscription-reason" value={fields.reason} maxLength={1000} onChange={(e)=>set('reason',e.target.value)} autoSize={{minRows:2}}/></Form.Item>{advanced?<Form.Item label="Motif de dérogation (avancé, si nécessaire)"><Input.TextArea value={fields.exceptionReason} maxLength={1000} onChange={(e)=>set('exceptionReason',e.target.value)}/></Form.Item>:null}</Form>
      {request?<Alert type="info" message="Cette demande sera marquée traitée uniquement si l’opération réussit." description={`Début souhaité : ${request.desired_start?subDate(request.desired_start,data.timezone):'non précisé'}. Commentaire : ${request.comment||'aucun'}`}  style={{marginBottom:12}}/>:null}
      {preview?<>
        {preview.warnings.map((warning:string)=><Alert key={warning} type="warning" message={warning} showIcon style={{marginBottom:12}}/>)}
        {request?<Typography.Paragraph><strong>Référence de paiement :</strong> {preview.paymentReference||'Non renseignée'}</Typography.Paragraph>:null}<Typography.Title level={5}>Avant → après</Typography.Title><Typography.Paragraph>Échéance actuelle : {subDate(preview.before.tracked?.ends_at,preview.timezone)}.</Typography.Paragraph><Typography.Paragraph>{preview.before.effective?.plan_name||'Gratuit'} → {preview.after.effective?.plan_name||'Gratuit'} · Fuseau {preview.timezone}</Typography.Paragraph>
        {preview.changed.map((r:any)=><div key={r.id} className="admin-panel" style={{marginBottom:12}}><strong>{r.plan_name||r.plan_code}</strong> · {SUB_STATES[r.status]||r.status}<div>{subDate(r.started_at,preview.timezone)} → {subDate(r.ends_at,preview.timezone)}</div></div>)}
        <Typography.Paragraph>Comparaison des droits à la prise d’effet : {subDate(preview.comparisonAt,preview.timezone)}.</Typography.Paragraph><Table size="small" rowKey="key" scroll={{x:550}} pagination={false} dataSource={featureChanges} columns={[{title:'Fonctionnalité',dataIndex:'label'},{title:'Avant',dataIndex:'before',render:feature},{title:'Après',dataIndex:'after',render:feature},{title:'Usage actuel',dataIndex:'used',render:(value:any,row:any)=><span>{value??'—'}{value!=null&&(!row.after.enabled||row.after.quota!=null&&value>row.after.quota)?<Tag color="warning">Dépassement — données conservées</Tag>:null}</span>}]}/>
        <Typography.Paragraph type="secondary" style={{marginTop:12}}>Les dates affichées sont celles de l’opération à confirmer. Une modification du dossier ou une échéance atteinte impose un nouvel aperçu.</Typography.Paragraph>
      </>:null}</>:null}
    </>:null}
  </Modal></>;
}

const VIEWS=[['encours','En cours'],['soon','Expirent bientôt'],['essai','Essais'],['expire','Expirés'],['suspendu','Suspendus'],['prevu','Prévus'],['history','Historique'],['all','Tout']];
export function SubscriptionList() {
  const {permissions}=useAuth();const navigate=useNavigate();const [params,setParams]=useSearchParams();const [assign,setAssign]=useState(false);const refresh=useRefresh();
  const view=params.get('view')||'encours';const page=Number(params.get('page'))||1;const size=Number(params.get('size'))||25;
  const set=(key:string,value:string)=>setParams((previous)=>{const next=new URLSearchParams(previous);if(value)next.set(key,value);else next.delete(key);if(key!=='page')next.delete('page');return next;},{replace:true});
  const query=useQuery({queryKey:['subscription-periods',params.toString()],queryFn:async()=>(await api('/subscription-periods?'+params)).json});
  const offers=useQuery({queryKey:['subscription-options'],queryFn:async()=>(await api('/subscription-options')).json});
  const exportRows=async()=>{try{const rows=(await api('/subscription-periods/export?'+params)).json;const keys=['user_name','user_email','plan_name','period','state','started_at','ends_at'];download('abonnements.csv',toCsv([keys,...rows.map((r:any)=>keys.map((key)=>r[key]))]));}catch(e:any){message.error(e.message);}};
  useEffect(()=>{if(params.get('assign')==='1'){setAssign(true);set('assign','');}},[]);
  return <div style={{padding:24}}><PageHeader title="Abonnements" subtitle="Accès effectifs, échéances et périodes à venir. Les décisions restent manuelles." actions={<Space wrap><Button onClick={()=>query.refetch()}>Actualiser</Button><Button onClick={exportRows}>Exporter CSV</Button>{permits(permissions,'subscriptions.advanced')?<Button onClick={()=>navigate('/subscription-review')}>Rapport de reprise</Button>:null}{permits(permissions,'subscriptions.manage')?<Button type="primary" onClick={()=>setAssign(true)}>Attribuer un abonnement</Button>:null}</Space>}/>
    <Tabs activeKey={view} onChange={(value)=>set('view',value)} items={VIEWS.map(([key,label])=>({key,label:label+(query.data?` (${query.data.counts[key]||0})`:'')}))}/>
    <Space wrap style={{marginBottom:16}}><Input.Search key={params.get('q')||''} defaultValue={params.get('q')||''} placeholder="Nom ou e-mail" allowClear style={{width:280}} onSearch={(value)=>set('q',value)}/>{view==='soon'?<Select aria-label="Délai d’échéance" value={params.get('days')||'7'} onChange={(value)=>set('days',value)} options={['3','7','30'].map((value)=>({value,label:`Sous ${value} jours`}))}/>:null}<Select placeholder="Filtrer par offre" allowClear style={{width:240}} value={params.get('plan')||undefined} onChange={(value)=>set('plan',value||'')} options={(offers.data||[]).map((r:any)=>({value:r.code,label:r.name+' · '+r.period}))}/></Space>
    <QueryFeedback loading={query.isLoading} error={query.error} retry={query.refetch}/>
    {query.data&&!query.error?<ManagedTable tableKey="subscription-periods" rowKey="id" scroll={{x:'max-content'}} dataSource={query.data.rows} pagination={{current:page,pageSize:size,total:query.data.total,showSizeChanger:true,pageSizeOptions:[25,50,100],onChange:(p,s)=>setParams((previous)=>{const next=new URLSearchParams(previous);next.set('page',String(p));next.set('size',String(s));return next;},{replace:true})}} columns={[
      {title:'Utilisateur',key:'user',render:(r:any)=><Link to={`/subscriptions/users/${r.user_id}`}>{r.user_name||r.user_email}<div>{r.user_email}</div></Link>},
      {title:'Offre',dataIndex:'plan_name'},{title:'Période',dataIndex:'period'},{title:'État',dataIndex:'state',render:(value:string)=><State value={value}/>},
      {title:'Accès effectif',dataIndex:'effectivePlan'},{title:'Début',dataIndex:'started_at',render:(value:any)=>subDate(value,query.data.timezone)},{title:'Fin',dataIndex:'ends_at',render:(value:any)=>subDate(value,query.data.timezone)},
      {title:'Temps restant',dataIndex:'daysLeft',render:(value:any)=>value==null?'Sans échéance':`${value} jour(s)`},{title:'À venir',dataIndex:'upcoming',render:(value:any)=>value?`${value.plan_name} — ${subDate(value.started_at,query.data.timezone)}`:'—'},
      {title:'Revue',dataIndex:'needsReview',render:(value:boolean)=>value?<Tag color="warning">À vérifier</Tag>:'—'},
    ]}/>:null}
    {assign?<SubscriptionWizard onClose={()=>setAssign(false)} onDone={refresh}/>:null}
  </div>;
}
export function SubscriptionDetail() {
  const {permissions}=useAuth();const {userId}=useParams();const query=useDossier(userId);const refresh=useRefresh();const [action,setAction]=useState<{action:string;id?:string}|null>(null);const data=query.data;
  return <div style={{padding:24}}><PageHeader title={data?.user.name||data?.user.email||'Abonnement'} back={{label:'Abonnements',to:'/subscriptions'}} actions={<Button onClick={()=>query.refetch()}>Actualiser</Button>}/><QueryFeedback loading={query.isLoading} error={query.error} retry={query.refetch}/>{data?<>
    <SubscriptionSummary data={data} onAction={(name,id)=>setAction({action:name,id})}/>
    <div className="record-layout" style={{marginTop:20}}><section className="admin-panel"><Typography.Title level={5}>Périodes</Typography.Title><Table rowKey="id" size="small" scroll={{x:650}} dataSource={data.rows} pagination={false} columns={[{title:'Offre',dataIndex:'plan_name'},{title:'État',dataIndex:'state',render:(value:string)=><State value={value}/>},{title:'Début',dataIndex:'started_at',render:(v:any)=>subDate(v,data.timezone)},{title:'Fin',dataIndex:'ends_at',render:(v:any)=>subDate(v,data.timezone)},{title:'Action',key:'action',render:(r:any)=>permits(permissions,'subscriptions.advanced')?<Button size="small" onClick={()=>setAction({action:'correct',id:r.id})}>Corriger les dates</Button>:null}]}/></section>
      <aside className="admin-panel"><Typography.Title level={5}>Droits particuliers</Typography.Title>{data.overrides.length?data.overrides.map((o:any)=><div key={o.id}><strong>{o.feature_code}</strong> : {o.enabled?'accordé':'retiré'} · quota {o.quota??'inchangé'}<div>Fin : {subDate(o.expires_at,data.timezone)}</div><p>{o.reason}</p></div>):<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune dérogation"/>}</aside></div>
    <section className="admin-panel" style={{marginTop:20}}><Typography.Title level={5}>Historique des actions (50 dernières)</Typography.Title>{data.events.length?data.events.map((event:any)=><details key={event.id} style={{padding:'12px 0',borderBottom:'1px solid var(--ant-color-border)'}}><summary>{ACTIONS[event.action]||event.action} · {subDate(event.created_at,data.timezone)} · {event.admin_name}</summary><p>{event.reason}</p>{event.payment_reference?<Typography.Paragraph><strong>Référence de paiement :</strong> {event.payment_reference}</Typography.Paragraph>:null}<div className="record-layout"><pre className="record-json">Avant : {JSON.stringify(event.before,null,2)}</pre><pre className="record-json">Après : {JSON.stringify(event.after,null,2)}</pre></div></details>):<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune action du nouveau parcours"/>}</section>
  </>:null}{action?<SubscriptionWizard userId={userId} initialAction={action.action} targetId={action.id} onClose={()=>setAction(null)} onDone={refresh}/>:null}</div>;
}
export function SubscriptionLegacyLink(){const {id}=useParams();const query=useQuery({queryKey:['subscription-period-link',id],queryFn:async()=>(await api('/subscription-periods/'+id)).json});return query.data?<Navigate replace to={'/subscriptions/users/'+query.data.userId}/>:<QueryFeedback loading={query.isLoading} error={query.error} retry={query.refetch}/>;}
export function SubscriptionReview(){const query=useQuery({queryKey:['subscription-review'],queryFn:async()=>(await api('/subscription-review')).json});return <div style={{padding:24}}><PageHeader title="Rapport de reprise" back={{label:'Abonnements',to:'/subscriptions'}} actions={<Button onClick={()=>query.refetch()}>Actualiser</Button>}/><Alert type="info" showIcon message="Rapport en lecture seule. Aucun abonnement n’est corrigé, résilié ou réactivé automatiquement." style={{marginBottom:16}}/><QueryFeedback loading={query.isLoading} error={query.error} retry={query.refetch}/>{query.data?<><Typography.Paragraph>{query.data.totalPeriods} période(s) conservée(s).</Typography.Paragraph><Table rowKey="userId" scroll={{x:650}} dataSource={query.data.issues} columns={[{title:'Utilisateur',key:'user',render:(r:any)=><Link to={'/subscriptions/users/'+r.userId}>{r.name||r.email}</Link>},...['overlaps','invalidDates','unlimited','ambiguous','legacyFuture'].map((key,index)=>({title:['Chevauchements','Dates incohérentes','Sans échéance','Statuts à revoir','Futurs historiques'][index],key,render:(r:any)=>r[key].length}))]}/></>:null}</div>;}

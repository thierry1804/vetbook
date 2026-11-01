import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Input, Modal, Space, Tabs, Typography, message } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { api, permits } from './api';
import { useAuth } from './auth';
import { PageHeader } from './ui';
import { QueryFeedback } from './QueryFeedback';
import { ManagedTable } from './ManagedTable';
import { SubscriptionWizard, subDate } from './Subscriptions';

const STATES:Record<string,string>={open:'À traiter',nouveau:'Nouveau',en_cours:'En cours',traite:'Traité',refuse:'Refusé',annule:'Annulé','':'Tout'};
export function SubscriptionRequests() {
  const {permissions}=useAuth();const canManage=permits(permissions,'subscriptions.manage');const qc=useQueryClient();const [params,setParams]=useSearchParams();
  const [processing,setProcessing]=useState<any>(null);const [reject,setReject]=useState<any>(null);const [reply,setReply]=useState('');const [note,setNote]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const query=useQuery({queryKey:['subscription-requests',params.toString()],queryFn:async()=>(await api('/subscription-requests?'+new URLSearchParams({status:params.get('status')??'open',q:params.get('q')||'',page:params.get('page')||'1'}))).json});
  const refresh=()=>{for(const key of ['subscription-requests','subscription','subscription-periods','work-queue'])qc.invalidateQueries({queryKey:[key]});};
  const set=(key:string,value:string)=>setParams((previous)=>{const next=new URLSearchParams(previous);next.set(key,value);if(key!=='page')next.delete('page');return next;},{replace:true});
  const update=async(row:any,status:string)=>{setBusy(true);setError('');try{await api('/subscription-requests/'+row.id,{method:'PUT',body:{status,version:row.version,publicReply:reply,internalNote:status==='refuse'?note:row.internal_note||''}});message.success('Demande mise à jour');setReject(null);setReply('');setNote('');refresh();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  const close=()=>{if(reply||note)Modal.confirm({title:'Fermer sans enregistrer ?',okText:'Fermer',cancelText:'Continuer',onOk:()=>setReject(null)});else setReject(null);};
  return <div style={{padding:24}}><PageHeader title="Demandes d’abonnement" subtitle="Les demandes n’activent aucun accès. Leur traitement utilise le même formulaire que les attributions administratives." actions={<Button onClick={()=>query.refetch()}>Actualiser</Button>}/>
    <Tabs activeKey={params.get('status')??'open'} onChange={(value)=>set('status',value)} items={Object.entries(STATES).map(([key,label])=>({key,label:label+(query.data?` (${query.data.counts[key]||0})`:'')}))}/>
    <Input.Search key={params.get('q')||''} defaultValue={params.get('q')||''} placeholder="Nom, e-mail ou référence" allowClear style={{width:280,marginBottom:16}} onSearch={(value)=>set('q',value)}/>
    {error&&!reject?<Alert type="error" message={error} style={{marginBottom:12}}/>:null}<QueryFeedback loading={query.isLoading} error={query.error} retry={query.refetch}/>
    {query.data&&!query.error?<ManagedTable tableKey="subscription-requests" rowKey="id" scroll={{x:'max-content'}} dataSource={query.data.rows} pagination={{current:Number(params.get('page'))||1,pageSize:25,total:query.data.total,onChange:(page)=>set('page',String(page))}} columns={[
      {title:'Utilisateur',key:'user',render:(r:any)=><Link to={'/subscriptions/users/'+r.user_id}>{r.user_name||r.user_email}<div>{r.user_email}</div></Link>},
      {title:'Type',dataIndex:'kind',render:(value:string)=>value==='renew'?'Renouvellement':'Attribution'},{title:'Offre',dataIndex:'plan_name'},{title:'Variante',dataIndex:'period'},{title:'État',dataIndex:'status',render:(value:string)=>STATES[value]},
      {title:'Date souhaitée',dataIndex:'desired_start',render:(value:any)=>value?subDate(value):'Non précisée'},{title:'Référence de paiement',dataIndex:'payment_reference',render:(value:any)=>value||'—'},{title:'Commentaire du client',dataIndex:'comment'},{title:'Responsable',dataIndex:'assigned_name'},{title:'Reçue le',dataIndex:'created_at',render:(v:any)=>subDate(v)},
      {title:'Actions',key:'actions',render:(r:any)=>canManage&&['nouveau','en_cours'].includes(r.status)?<Space wrap><Button size="small" loading={busy} onClick={()=>update(r,'en_cours')}>Prendre en charge</Button><Button size="small" type="primary" onClick={()=>setProcessing(r)}>Traiter</Button><Button size="small" danger onClick={()=>{setReply('');setNote(r.internal_note||'');setError('');setReject(r);}}>Refuser</Button></Space>:r.public_reply||'—'},
    ]}/>:null}
    {processing?<SubscriptionWizard userId={processing.user_id} request={processing} initialAction={processing.kind==='renew'?'renew':'assign'} onClose={()=>setProcessing(null)} onDone={refresh}/>:null}
    <Modal open={!!reject} title="Répondre à la demande" onCancel={()=>{if(!busy)close();}} footer={<Space><Button disabled={busy} onClick={close}>Annuler</Button><Button danger type="primary" loading={busy} disabled={reply.trim().length<5} onClick={()=>update(reject,'refuse')}>Confirmer le refus</Button></Space>}>
      {error?<Alert type="error" message={error} style={{marginBottom:12}}/>:null}<Typography.Paragraph>Le message ci-dessous sera visible par l’utilisateur. Les notes internes restent dans le backoffice.</Typography.Paragraph>
      <Input.TextArea aria-label="Réponse à l’utilisateur" placeholder="Réponse à l’utilisateur (5 caractères min.)" maxLength={1000} value={reply} onChange={(e)=>setReply(e.target.value)} autoSize={{minRows:3}}/>
      <Input.TextArea aria-label="Note interne" placeholder="Note interne (facultatif)" maxLength={2000} value={note} onChange={(e)=>setNote(e.target.value)} autoSize={{minRows:2}} style={{marginTop:12}}/>
    </Modal>
  </div>;
}

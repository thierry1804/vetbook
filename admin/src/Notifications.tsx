import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Drawer, Empty, List, Space, Switch, Typography, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';

function keyBytes(key:string){const text=atob(key.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(text,c=>c.charCodeAt(0));}
export function Notifications(){
 const {me}=useAuth();const qc=useQueryClient();const navigate=useNavigate();const [open,setOpen]=useState(false);const [unread,setUnread]=useState(false);const [offset,setOffset]=useState(0);const [connected,setConnected]=useState(false);const [push,setPush]=useState(false);const [busy,setBusy]=useState(false);
 const query=useQuery({queryKey:['inbox',me?.id,unread,offset],queryFn:async()=>(await api('/notifications?'+new URLSearchParams({unread:unread?'1':'0',offset:String(offset)}))).json,refetchInterval:connected?false:30000});
 useEffect(()=>{
  if(!me)return;const stream=new EventSource('/api/admin/events');
  let refreshTimer:ReturnType<typeof setTimeout>;
  const refresh=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{for(const key of ['inbox','subscription','subscription-periods','subscription-requests','subscription-review','support-requests','work-queue','one','dashboard'])qc.invalidateQueries({queryKey:[key]});window.dispatchEvent(new Event('applika:realtime'));},120);};
  stream.addEventListener('ready',()=>{setConnected(true);refresh();});
  stream.addEventListener('change',()=>refresh());stream.onerror=()=>setConnected(false);
  stream.addEventListener('session-ended',()=>{stream.close();setConnected(false);window.location.reload();});
  const foreground=()=>{if(!document.hidden)refresh();};window.addEventListener('online',refresh);document.addEventListener('visibilitychange',foreground);
  return()=>{clearTimeout(refreshTimer);stream.close();window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',foreground);};
 },[me?.id,qc]);
 useEffect(()=>{if(connected)return;const timer=setInterval(()=>{for(const key of ['subscription','subscription-periods','subscription-requests','support-requests','work-queue','dashboard'])qc.invalidateQueries({queryKey:[key]});window.dispatchEvent(new Event('applika:realtime'));},30000);return()=>clearInterval(timer);},[connected,qc]);
 useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration('/').then(r=>r?.pushManager.getSubscription()).then(s=>setPush(!!s)).catch(()=>{});},[]);
 const read=async(id?:string)=>{try{await api('/notifications/read',{method:'POST',body:id?{id}:{before:query.data.checkedAt}});qc.invalidateQueries({queryKey:['inbox']});}catch(e:any){message.error(e.message);}};
 const togglePush=async()=>{setBusy(true);try{
  if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('Les notifications push ne sont pas disponibles dans ce navigateur.');
  const registration=await navigator.serviceWorker.register('/admin-sw.js',{scope:'/'});await navigator.serviceWorker.ready;
  if(push){const s=await registration.pushManager.getSubscription();if(s){await api('/notifications/push',{method:'DELETE',body:{endpoint:s.endpoint}});await s.unsubscribe();}setPush(false);return;}
  if(await Notification.requestPermission()!=='granted')throw new Error('Autorise les notifications dans les réglages du navigateur.');
  const existing=await registration.pushManager.getSubscription();const s=existing||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(query.data.vapidPublicKey)});
  try{await api('/notifications/push',{method:'POST',body:s.toJSON()});}catch(e){if(!existing)await s.unsubscribe();throw e;}setPush(true);
 }catch(e:any){message.error(e.message);}finally{setBusy(false);}};
 return <><Badge count={query.data?.unread||0} size="small"><Button type="text" icon={<BellOutlined/>} aria-label="Notifications" onClick={()=>setOpen(true)}/></Badge>
  <Drawer open={open} onClose={()=>setOpen(false)} title="Notifications" width="min(440px, 100vw)">
   <Space wrap style={{marginBottom:16}}><Switch checked={unread} checkedChildren="Non lues" unCheckedChildren="Toutes" onChange={v=>{setUnread(v);setOffset(0);}}/><Button onClick={()=>query.refetch()}>Actualiser</Button><Button disabled={!query.data?.unread} onClick={()=>read()}>Tout marquer comme lu</Button></Space>
   <Typography.Paragraph type="secondary">{connected?'Mises à jour en direct':'Reconnexion en cours · vérification périodique active'}</Typography.Paragraph>
   {query.data?.pushConfigured?<Button loading={busy} onClick={togglePush} style={{marginBottom:16}}>{push?'Désactiver les notifications sur cet appareil':'Activer les notifications sur cet appareil'}</Button>:<Typography.Paragraph type="secondary">Les notifications restent disponibles ici. Le push externe n’est pas configuré.</Typography.Paragraph>}
   {query.error?<Alert type="error" message="Notifications indisponibles" action={<Button onClick={()=>query.refetch()}>Réessayer</Button>}/>:null}
   <List loading={query.isLoading} locale={{emptyText:<Empty description="Aucune notification"/>}} dataSource={query.data?.rows||[]} renderItem={(row:any)=><List.Item><div style={{width:'100%'}}><Typography.Text strong={!row.read_at}>{row.title}</Typography.Text><Typography.Paragraph style={{margin:'6px 0'}}>{row.body}</Typography.Paragraph><Typography.Text type="secondary">{new Date(row.created_at).toLocaleString('fr-FR')}</Typography.Text><Space wrap style={{display:'flex',marginTop:8}}><Button size="small" onClick={()=>{read(row.id);setOpen(false);navigate(row.href);}}>Ouvrir</Button>{!row.read_at?<Button size="small" onClick={()=>read(row.id)}>Marquer comme lue</Button>:null}</Space></div></List.Item>}/>
   <Space><Button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-30))}>Précédent</Button><Button disabled={query.data?.next==null} onClick={()=>setOffset(query.data.next)}>Suivant</Button></Space>
  </Drawer></>;
}

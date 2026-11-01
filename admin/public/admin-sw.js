self.addEventListener('push',event=>{
 let data={};try{data=event.data.json();}catch{/* invalid payload */}
 event.waitUntil(self.registration.showNotification(data.title||"App'lika — backoffice",{body:data.body||'',tag:data.tag||'admin-notice',data:{url:data.url||'/subscription-requests'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL(event.notification.data?.url||'/',self.location.origin);
 if(url.origin!==self.location.origin)return;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{for(const client of windows){if('navigate' in client)await client.navigate(url.href);await client.focus();return;}return clients.openWindow(url.href);}));
});

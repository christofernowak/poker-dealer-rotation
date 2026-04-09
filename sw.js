const CACHE='pdr-v3';
const FILES=['/','/index.html','/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES).catch(()=>c.addAll(['/index.html']))));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
      if(res.status===200){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}
      return res;
    }).catch(()=>caches.match('/index.html')))
  );
});

/* Push notification handler — triggered by Firebase Cloud Messaging */
self.addEventListener('push',e=>{
  let data={title:'Hora do Revezamento!',body:'',moves:[]};
  try{if(e.data)data=e.data.json();}catch(err){}
  e.waitUntil(
    self.registration.showNotification(data.title,{
      body:data.body||data.moves.map(m=>m.name+' → Mesa '+m.table).join('\n'),
      icon:'/icons/icon-192.png',
      badge:'/icons/icon-192.png',
      vibrate:[200,100,200,100,200],
      tag:'rotation',
      renotify:true,
      data:{url:self.location.origin}
    })
  );
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(list=>{
    for(const c of list){if(c.url===e.notification.data.url&&'focus'in c)return c.focus();}
    if(clients.openWindow)return clients.openWindow(e.notification.data.url);
  }));
});

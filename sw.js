/* Cache version — bump this string on every deploy to force update on all clients */
const CACHE='pdr-v'+Date.now().toString(36).slice(-5);
const FILES=['/','/index.html','/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES).catch(()=>c.addAll(['/index.html']))));
  /* Force immediate activation — don't wait for old tabs to close */
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  /* Delete ALL old caches immediately */
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>{console.log('[SW] Deleting old cache:',k);return caches.delete(k);})
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  /* Network-first for index.html so updates are always picked up.
     Cache-first for static assets (icons, manifest). */
  const url=new URL(e.request.url);
  const isHTML=url.pathname==='/'||url.pathname.endsWith('.html');
  if(isHTML){
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res.status===200){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}
        return res;
      }).catch(()=>caches.match(e.request).then(c=>c||caches.match('/index.html')))
    );
  }else{
    e.respondWith(
      caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
        if(res.status===200){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}
        return res;
      }))
    );
  }
});

/* Push notification handler */
self.addEventListener('push',e=>{
  let data={title:'Hora do Revezamento!',body:'',moves:[]};
  try{if(e.data)data=e.data.json();}catch(err){}
  e.waitUntil(
    self.registration.showNotification(data.title,{
      body:data.body||data.moves.map(m=>m.name+' → Mesa '+m.table).join('\n'),
      icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',
      vibrate:[200,100,200,100,200],tag:'rotation',renotify:true,
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

/* Tell all open tabs to reload when a new SW takes over */
self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});

// Service Worker pour les notifications push - Gestion Affichage
const CACHE_NAME = 'gestion-affichage-v1';
const urlsToCache = [
    './',
    './GestionAffiches180725_v6_v10v9.html'
];

// Installation du Service Worker
self.addEventListener('install', function(event) {
    console.log('🔧 Service Worker: Installation');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('📦 Service Worker: Cache ouvert');
                return cache.addAll(urlsToCache);
            })
            .catch(function(error) {
                console.error('❌ Service Worker: Erreur cache:', error);
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', function(event) {
    console.log('✅ Service Worker: Activation');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Gestion des requêtes (cache-first strategy)
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});

// Gestion des notifications push reçues en arrière-plan
self.addEventListener('push', function(event) {
    console.log('📱 Service Worker: Push reçu', event);
    
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('📧 Service Worker: Données push:', data);
            
            const options = {
                body: data.body || 'Nouvelle notification',
                icon: data.icon || './favicon.ico',
                badge: './badge.png',
                tag: data.tag || 'gestion-affichage',
                data: data.data || {},
                vibrate: [200, 100, 200],
                requireInteraction: data.requireInteraction || false,
                actions: [
                    {
                        action: 'open',
                        title: 'Ouvrir l\'app',
                        icon: './favicon.ico'
                    },
                    {
                        action: 'close',
                        title: 'Fermer',
                        icon: './close.png'
                    }
                ]
            };
            
            event.waitUntil(
                self.registration.showNotification(data.title || 'Gestion Affichage', options)
            );
        } catch (error) {
            console.error('❌ Service Worker: Erreur traitement push:', error);
            
            event.waitUntil(
                self.registration.showNotification('Gestion Affichage', {
                    body: 'Nouvelle notification disponible',
                    icon: './favicon.ico',
                    tag: 'gestion-affichage-fallback'
                })
            );
        }
    }
});

// Gestion du clic sur une notification
self.addEventListener('notificationclick', function(event) {
    console.log('👆 Service Worker: Clic notification:', event.notification.tag);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            console.log('🔍 Service Worker: Recherche fenêtres ouvertes:', clientList.length);
            
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                const clientUrl = new URL(client.url);
                const currentUrl = new URL(self.location.origin);
                
                if (clientUrl.origin === currentUrl.origin && 'focus' in client) {
                    console.log('🎯 Service Worker: Focus sur fenêtre existante');
                    return client.focus();
                }
            }
            
            if (clients.openWindow) {
                console.log('🪟 Service Worker: Ouverture nouvelle fenêtre');
                return clients.openWindow('./');
            }
        }).catch(function(error) {
            console.error('❌ Service Worker: Erreur gestion clic:', error);
        })
    );
});

// Gestion de la fermeture de notification
self.addEventListener('notificationclose', function(event) {
    console.log('❌ Service Worker: Notification fermée:', event.notification.tag);
});

// Gestion des messages depuis l'app principale
self.addEventListener('message', function(event) {
    console.log('💬 Service Worker: Message reçu:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME,
            timestamp: Date.now()
        });
    }
});

console.log('🚀 Service Worker: Script chargé et prêt');
// Service Worker pour notifications push - Version finale v7
const CACHE_NAME = 'gestion-affichage-v7-final';

// Installation du Service Worker
self.addEventListener('install', function(event) {
    console.log('🔧 Service Worker: Installation v7-final');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('📦 Service Worker: Cache créé (vide au départ)');
                return Promise.resolve();
            })
    );
    
    // Activer immédiatement
    self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', function(event) {
    console.log('✅ Service Worker: Activation v7-final');
    
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
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fonction pour vérifier si une URL est valide pour le cache
function isValidCacheRequest(request) {
    const url = new URL(request.url);
    
    // Ignorer les schemes non-HTTP
    if (!url.protocol.startsWith('http')) {
        return false;
    }
    
    // Ignorer les extensions de navigateur
    if (url.protocol === 'chrome-extension:' || 
        url.protocol === 'moz-extension:' || 
        url.protocol === 'safari-extension:') {
        return false;
    }
    
    // Ignorer les APIs externes sensibles
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('emailjs') ||
        url.hostname.includes('gstatic') ||
        url.hostname.includes('googleapis')) {
        return false;
    }
    
    // Ignorer les requêtes non-GET
    if (request.method !== 'GET') {
        return false;
    }
    
    return true;
}

// Gestion des requêtes (stratégie réseau d'abord, puis cache)
self.addEventListener('fetch', function(event) {
    // Vérifier si la requête est valide pour le cache
    if (!isValidCacheRequest(event.request)) {
        // Laisser passer sans traitement pour les requêtes non-cachables
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                // Vérifier que la réponse est valide
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                // Cloner la réponse pour la mettre en cache
                const responseClone = response.clone();
                
                // Mettre en cache de manière sécurisée
                caches.open(CACHE_NAME)
                    .then(function(cache) {
                        try {
                            cache.put(event.request, responseClone);
                        } catch (error) {
                            console.log('⚠️ Impossible de mettre en cache:', event.request.url, error.message);
                        }
                    });
                
                return response;
            })
            .catch(function(error) {
                console.log('🔍 Tentative récupération cache pour:', event.request.url);
                // En cas d'échec réseau, essayer le cache
                return caches.match(event.request);
            })
    );
});

// Gestion des notifications push reçues en arrière-plan
self.addEventListener('push', function(event) {
    console.log('📱 Service Worker: Push reçu v7-final', event);
    
    let notificationData = {
        title: 'Gestion Affichage',
        body: 'Nouvelle notification disponible',
        icon: './favicon.ico',
        badge: './badge.png',
        tag: 'gestion-affichage-default'
    };
    
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('📧 Service Worker: Données push:', data);
            
            notificationData = {
                title: data.title || 'Gestion Affichage',
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
                        title: 'Ouvrir l\'app'
                    },
                    {
                        action: 'close',
                        title: 'Fermer'
                    }
                ]
            };
        } catch (error) {
            console.error('❌ Service Worker: Erreur parsing push data:', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, notificationData)
    );
});

// Gestion du clic sur une notification
self.addEventListener('notificationclick', function(event) {
    console.log('👆 Service Worker: Clic notification v7-final:', event.notification.tag);
    
    event.notification.close();
    
    if (event.action === 'close') {
        console.log('❌ Action: Fermer notification');
        return;
    }
    
    // Ouvrir ou focuser l'application
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                console.log('🔍 Service Worker: Recherche fenêtres:', clientList.length);
                
                // Chercher une fenêtre existante
                for (let client of clientList) {
                    if (client.url.includes('github.io') || client.url.includes('localhost')) {
                        console.log('🎯 Service Worker: Focus fenêtre existante');
                        return client.focus();
                    }
                }
                
                // Ouvrir nouvelle fenêtre
                if (clients.openWindow) {
                    console.log('🪟 Service Worker: Nouvelle fenêtre');
                    return clients.openWindow('/');
                }
            })
            .catch(function(error) {
                console.error('❌ Service Worker: Erreur clic notification:', error);
            })
    );
});

// Gestion de la fermeture de notification
self.addEventListener('notificationclose', function(event) {
    console.log('❌ Service Worker: Notification fermée:', event.notification.tag);
});

// Gestion des messages depuis l'app principale
self.addEventListener('message', function(event) {
    if (!event.data) return;
    
    console.log('💬 Service Worker: Message v7-final:', event.data);
    
    switch (event.data.type) {
        case 'SKIP_WAITING':
            console.log('⏩ Service Worker: Skip waiting');
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({
                    version: CACHE_NAME,
                    timestamp: Date.now()
                });
            }
            break;
            
        case 'TEST_PUSH':
            console.log('🧪 Service Worker: Test push');
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({
                    status: 'active',
                    version: CACHE_NAME
                });
            }
            break;
    }
});

// Gestion des erreurs globales
self.addEventListener('error', function(event) {
    console.error('❌ Service Worker: Erreur globale:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Service Worker: Promise rejetée:', event.reason);
    // Empêcher l'erreur de remonter
    event.preventDefault();
});

console.log('🚀 Service Worker v7-final: Chargé et prêt');

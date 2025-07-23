// Service Worker pour les notifications push - Gestion Affichage (Corrigé)
const CACHE_NAME = 'gestion-affichage-v7';

// URLs à mettre en cache (corrigées pour GitHub Pages)
const urlsToCache = [
    // Ne pas mettre d'URLs pour éviter les erreurs de cache
    // Le cache sera géré dynamiquement lors des requêtes
];

// Installation du Service Worker
self.addEventListener('install', function(event) {
    console.log('🔧 Service Worker: Installation v7');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('📦 Service Worker: Cache ouvert (sans URLs prédéfinies)');
                // Pas d'addAll pour éviter les erreurs
                return Promise.resolve();
            })
            .catch(function(error) {
                console.error('❌ Service Worker: Erreur cache:', error);
            })
    );
    
    // Activer immédiatement le nouveau Service Worker
    self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', function(event) {
    console.log('✅ Service Worker: Activation v7');
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
            // Prendre le contrôle de tous les clients immédiatement
            return self.clients.claim();
        })
    );
});

// Gestion des requêtes (stratégie network-first pour éviter les erreurs)
self.addEventListener('fetch', function(event) {
    // Ignorer les requêtes non-GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Ignorer les requêtes vers des APIs externes
    if (event.request.url.includes('firebase') || 
        event.request.url.includes('emailjs') ||
        event.request.url.includes('gstatic')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                // Cloner la réponse car elle ne peut être consommée qu'une fois
                const responseClone = response.clone();
                
                // Mettre en cache seulement les réponses OK
                if (response.status === 200) {
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseClone);
                        })
                        .catch(function(error) {
                            console.log('⚠️ Erreur mise en cache:', error);
                        });
                }
                
                return response;
            })
            .catch(function(error) {
                console.log('🔍 Tentative cache pour:', event.request.url);
                // En cas d'échec réseau, essayer le cache
                return caches.match(event.request);
            })
    );
});

// Gestion des notifications push reçues en arrière-plan
self.addEventListener('push', function(event) {
    console.log('📱 Service Worker: Push reçu v7', event);
    
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('📧 Service Worker: Données push:', data);
            
            const options = {
                body: data.body || 'Nouvelle notification',
                icon: './favicon.ico',
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
                        title: 'Fermer'
                    }
                ]
            };
            
            event.waitUntil(
                self.registration.showNotification(data.title || 'Gestion Affichage', options)
            );
        } catch (error) {
            console.error('❌ Service Worker: Erreur traitement push:', error);
            
            // Notification de fallback
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
    console.log('👆 Service Worker: Clic notification v7:', event.notification.tag);
    
    event.notification.close();
    
    if (event.action === 'close') {
        console.log('❌ Action: Fermer notification');
        return;
    }
    
    // Pour l'action 'open' ou clic normal
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            console.log('🔍 Service Worker: Recherche fenêtres ouvertes:', clientList.length);
            
            // Chercher une fenêtre existante de l'app
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                
                // Vérifier si c'est notre app
                if (client.url.includes('github.io') && 'focus' in client) {
                    console.log('🎯 Service Worker: Focus sur fenêtre existante');
                    return client.focus();
                }
            }
            
            // Sinon, ouvrir une nouvelle fenêtre
            if (clients.openWindow) {
                console.log('🪟 Service Worker: Ouverture nouvelle fenêtre');
                return clients.openWindow('/');
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
    console.log('💬 Service Worker: Message reçu v7:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('⏩ Service Worker: Skip waiting demandé');
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME,
            timestamp: Date.now()
        });
    }
    
    if (event.data && event.data.type === 'TEST_PUSH') {
        console.log('🧪 Service Worker: Test push demandé');
        // Répondre que le Service Worker est actif
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
                status: 'active',
                version: CACHE_NAME
            });
        }
    }
});

// Gestion des erreurs globales
self.addEventListener('error', function(event) {
    console.error('❌ Service Worker: Erreur globale:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Service Worker: Promise rejetée:', event.reason);
});

console.log('🚀 Service Worker v7: Script chargé et prêt');

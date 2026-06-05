'use strict';
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('js/sw.js').then(function(r) {
    console.log('SW registered:', r.scope);
  }).catch(function(e) {
    console.log('SW registration failed:', e);
  });
}

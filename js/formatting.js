'use strict';
/* Formatting helpers */
function formatDate(ts) { return new Date(ts).toLocaleDateString(); }
function formatBytes(bytes) { return (bytes / 1024).toFixed(1) + ' KB'; }
function truncate(str, n) { return str && str.length > n ? str.slice(0, n) + '...' : str; }

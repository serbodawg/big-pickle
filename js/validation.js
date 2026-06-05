'use strict';
/* Form validation helpers */
function isEmpty(str) { return !str || str.trim() === ''; }
function isValidUrl(str) { return /^https?:\/\//i.test(str) || /^mailto:/i.test(str); }
function maxLen(str, n) { return typeof str === 'string' && str.length <= n; }

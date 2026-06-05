'use strict';
/* Storage helpers */
function getJSON(key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(e) { return null; } }
function setJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }
function removeKey(key) { try { localStorage.removeItem(key); } catch(e) {} }

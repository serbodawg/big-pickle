'use strict';
function testUtils() {
  var c = 0, f = 0;
  function a(cond, msg) { if (cond) { c++; } else { f++; console.error('  FAIL: '+msg); } }
  console.log('=== Util Tests ===');

  a(escapeHtml('<>&"') === '&lt;&gt;&amp;&quot;', 'escapeHtml encodes');
  a(escapeHtml('hello') === 'hello', 'escapeHtml preserves safe');

  a(escapeAttr('<>&"\'') === '&lt;&gt;&amp;&quot;&#39;', 'escapeAttr encodes more');

  var chk1 = computeChecksum({a:1});
  var chk2 = computeChecksum({a:1});
  var chk3 = computeChecksum({a:2});
  a(chk1 === chk2, 'computeChecksum is deterministic');
  a(chk1 !== chk3, 'computeChecksum differs for different data');

  var id1 = generateId();
  var id2 = generateId();
  a(id1 !== id2, 'generateId produces unique ids');
  a(id1.indexOf('-') > 0, 'generateId has separator');

  console.log('=== Utils: '+c+' passed, '+f+' failed ===');
}

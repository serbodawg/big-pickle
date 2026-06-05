'use strict';
function testSecurity() {
  var c = 0, f = 0;
  function a(cond, msg) { if (cond) { c++; } else { f++; console.error('  FAIL: '+msg); } }
  console.log('=== Security Tests ===');

  a(sanitize('<script>alert(1)</script>') === 'alert(1)', 'sanitize strips tags');
  a(sanitize('onclick=alert(1)') === '=', 'sanitize strips event handlers');
  a(sanitize('javascript:alert(1)') === 'alert(1)', 'sanitize strips javascript:');
  a(sanitize('hello') === 'hello', 'sanitize preserves normal text');

  var token = generateToken();
  a(typeof token === 'string' && token.length === 64, 'generateToken returns 64 hex chars');
  a(/^[a-f0-9]{64}$/.test(token), 'token is valid hex');

  localStorage.setItem('test_csrf', token);
  a(validateCsrfToken(token), 'validateCsrfToken matches');
  a(!validateCsrfToken('bad'), 'validateCsrfToken rejects bad');

  localStorage.removeItem('test_csrf');
  console.log('=== Security: '+c+' passed, '+f+' failed ===');
}

/*
  Simple auth tests — run in browser console:
  > runTests()
*/

function runTests() {
  var passed = 0, failed = 0;

  function assert(cond, msg) {
    if (cond) { passed++; console.log('  PASS: ' + msg); }
    else { failed++; console.error('  FAIL: ' + msg); }
  }

  console.log('=== Auth Tests ===');

  /* 1. Fixed password decodes correctly */
  var pwd = getFixedPassword();
  assert(typeof pwd === 'string' && pwd.length > 0, 'getFixedPassword() returns a non-empty string');

  /* 2. SHA-256 produces 64-char hex */
  sha256('test').then(function(hash) {
    assert(/^[a-f0-9]{64}$/.test(hash), 'sha256() returns valid hex hash');

    /* 3. Login lockout */
    localStorage.removeItem(FAIL_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
    assert(!isLockedOut(), 'Not locked out initially');
    for (var i = 0; i < MAX_FAILS; i++) recordFailedAttempt();
    assert(isLockedOut(), 'Locked out after ' + MAX_FAILS + ' fails');

    localStorage.removeItem(FAIL_KEY);
    localStorage.removeItem(LOCKOUT_KEY);

    console.log('=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  });
}

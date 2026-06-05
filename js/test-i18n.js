'use strict';
function testI18n() {
  var c = 0, f = 0;
  function a(cond, msg) { if (cond) { c++; } else { f++; console.error('  FAIL: '+msg); } }
  console.log('=== i18n Tests ===');

  a(typeof translations === 'object', 'translations object exists');
  a(typeof translations.en === 'object', 'en translations exist');
  a(typeof translations.pl === 'object', 'pl translations exist');
  a(typeof translations.ru === 'object', 'ru translations exist');

  var origLang = currentLang;
  setLanguage('en');
  a(t('nav_home') === 'Home', 't() returns en string');
  setLanguage('pl');
  a(t('nav_home') === 'Strona G\u0142\xf3wna', 't() returns pl string');
  a(t('nonexistent_key') === 'nonexistent_key', 't() returns key for missing');
  setLanguage(origLang);

  a(typeof setTheme === 'function', 'setTheme is a function');
  a(typeof translatePage === 'function', 'translatePage is a function');

  console.log('=== i18n: '+c+' passed, '+f+' failed ===');
}

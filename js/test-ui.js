'use strict';
function testUI() {
  var c = 0, f = 0;
  function a(cond, msg) { if (cond) { c++; } else { f++; console.error('  FAIL: '+msg); } }
  console.log('=== UI Tests ===');

  a(typeof createCard === 'function', 'createCard is a function');
  a(typeof renderProjects === 'function', 'renderProjects is a function');
  a(typeof renderAll === 'function', 'renderAll is a function');
  a(typeof navigateTo === 'function', 'navigateTo is a function');
  a(typeof openAddModal === 'function', 'openAddModal is a function');
  a(typeof openEditModal === 'function', 'openEditModal is a function');
  a(typeof closeModal === 'function', 'closeModal is a function');
  a(typeof executeDelete === 'function', 'executeDelete is a function');
  a(typeof updateStats === 'function', 'updateStats is a function');
  a(typeof updateFilterBtns === 'function', 'updateFilterBtns is a function');

  console.log('=== UI: '+c+' passed, '+f+' failed ===');
}

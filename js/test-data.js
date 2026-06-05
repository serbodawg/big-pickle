'use strict';
function testData() {
  var c = 0, f = 0;
  function a(cond, msg) { if (cond) { c++; console.log('  PASS: '+msg); } else { f++; console.error('  FAIL: '+msg); } }
  console.log('=== Data Tests ===');

  var orig = projects.slice();
  var p = createProject({ name: 'Test', description: 'A test' });
  a(p !== null, 'createProject returns project');
  a(p.name === 'Test', 'name matches');
  a(projects.length === orig.length + 1, 'project added to array');

  var p2 = getProject(p.id);
  a(p2 !== null, 'getProject finds by id');
  a(p2.id === p.id, 'ids match');

  updateProject(p.id, { name: 'Updated' });
  a(getProject(p.id).name === 'Updated', 'updateProject changes name');

  deleteProject(p.id);
  a(getProject(p.id) === null, 'deleteProject removes project');
  a(projects.length === orig.length, 'array restored to original length');

  console.log('=== Data: '+c+' passed, '+f+' failed ===');
}

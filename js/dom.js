'use strict';
/* DOM helpers */
function el(tag, attrs, children) {
  var e = document.createElement(tag);
  if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (children) for (var i = 0; i < children.length; i++) e.appendChild(children[i]);
  return e;
}
function txt(str) { return document.createTextNode(str); }
function clear(el) { el.innerHTML = ''; return el; }

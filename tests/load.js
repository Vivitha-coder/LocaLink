// Loads the prototype's own <script> from index.html so the tests exercise the real code.
const fs = require('fs');
const path = require('path');

function mem() {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
}

module.exports = function load() {
  globalThis.window = globalThis;
  globalThis.localStorage = mem();
  globalThis.sessionStorage = mem();
  globalThis.location = { hash: '' };
  const el = () => ({ innerHTML: '', hidden: false, value: '', select() {} });
  globalThis.document = { querySelector: () => el(), addEventListener: () => {} };

  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  let src = html.match(/<script>([\s\S]*)<\/script>/)[1];
  src = src.replace(/\nif \(auth\.user && usersLoad[\s\S]*$/, '\n'); // skip the browser start-up lines
  const factory = new Function(src + `
    return { SERVICES, AREAS, SLOTS, seed, matches, dist, reliability, doSignup, doLogin, doUnlock, derive,
             MASTER, auth, usersLoad, userName, saveData,
             getD: () => D, setD: v => { D = v; }, getUI: () => ui, resetUI: () => { ui = freshUI(); } };
  `);
  return factory();
};

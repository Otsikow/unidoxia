import fs from 'node:fs';
import ts from 'typescript';

// Derive the host's SPA allowlist from the real router, including nested routes.
// Public data detail paths are validated against the rendered-record manifest.
export function spaRoutePatterns(source = fs.readFileSync('src/App.tsx', 'utf8')) {
  const routes = new Set();
  const file = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node, parent = '') {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening?.tagName.getText(file) === 'Route') {
      const attr = opening.attributes.properties.find(p => p.name?.getText(file) === 'path');
      const route = attr?.initializer && ts.isStringLiteral(attr.initializer) ? attr.initializer.text : '';
      const full = route.startsWith('/') ? route : `${parent}/${route}`.replace(/\/+/g, '/');
      if (route && route !== '*' && !['/courses/:id', '/universities/:id', '/blog/:slug', '/scholarships/:slug'].includes(full)) routes.add(full);
      if (ts.isJsxElement(node)) node.children.forEach(child => visit(child, full));
      return;
    }
    ts.forEachChild(node, child => visit(child, parent));
  }
  visit(file);
  return [...routes].sort();
}

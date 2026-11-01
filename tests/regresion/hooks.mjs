import { pathToFileURL } from 'url';
import path from 'path';
export async function resolve(spec, ctx, next) {
  if (spec === 'maplibre-gl') return { url: pathToFileURL(path.resolve('maplibre-stub.mjs')).href, shortCircuit: true };
  if (spec === 'three') return { url: pathToFileURL(path.resolve('three-stub.mjs')).href, shortCircuit: true };
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') ) { try { return await next(spec + '.js', ctx); } catch (_) { return await next(spec + '/index.js', ctx); } }
    throw e;
  }
}

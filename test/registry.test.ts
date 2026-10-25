import { afterEach, describe, it, expect, vi } from 'vitest';
import { Registry } from '../src/lib/registry';
import { dockerfileInstructions, layerHistory, type Manifest } from '../src/lib/docker-image';
import { dockerManifestList } from './fixtures/docker-manifest-list.js';
import { ociImageIndexManifest } from './fixtures/oci-image-index-manifest.js';
import { ociImageIndexLayer } from './fixtures/oci-image-index-layer.js';
const settings = { secured: false, cacheControl: false, catalogLimit: 2 };
const json = (data: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(data), { headers });
afterEach(() => vi.unstubAllGlobals());
describe('Registry transport', () => {
  it('follows catalog Link pages through the current proxy, and deduplicates names', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json({ repositories: ['a', 'b'] }, { Link: '<http://backend.example/v2/_catalog?n=2&last=b>; rel="next"' }),
      )
      .mockResolvedValueOnce(json({ repositories: ['b', 'c'] }));
    vi.stubGlobal('fetch', fetch);
    expect(await new Registry('https://registry.example', settings).catalog()).toEqual(['a', 'b', 'c']);
    expect(fetch.mock.calls[1][0]).toBe('https://registry.example/v2/_catalog?n=2&last=b');
  });
  it('follows tag pagination and accepts empty repositories', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ tags: ['v1'] }, { Link: '</v2/app/tags/list?last=v1>; rel="next"' }))
      .mockResolvedValueOnce(json({ tags: ['v2'] }))
      .mockResolvedValueOnce(json({ tags: null }));
    vi.stubGlobal('fetch', fetch);
    const registry = new Registry('', settings);
    expect(await registry.tags('app')).toEqual(['v1', 'v2']);
    expect(await registry.tags('empty')).toEqual([]);
  });
  it('includes credentials and cache controls when configured', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ repositories: [] }));
    vi.stubGlobal('fetch', fetch);
    await new Registry('', { ...settings, secured: true, cacheControl: true }).catalog();
    expect(fetch.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      headers: { 'Cache-Control': 'no-store, no-cache' },
    });
  });
  it('retries a basic-auth challenge with browser credentials', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(json({ repositories: ['app'] }));
    vi.stubGlobal('fetch', fetch);
    expect(await new Registry('https://registry.example', settings).catalog()).toEqual(['app']);
    expect(fetch.mock.calls[1][1].credentials).toBe('include');
  });
  it('exchanges a bearer challenge and retries with the token', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 401,
          headers: {
            'www-authenticate':
              'Bearer realm="https://auth.example/token",service="registry",scope="repository:app:pull"',
          },
        }),
      )
      .mockResolvedValueOnce(json({ token: 'test-token' }))
      .mockResolvedValueOnce(json({ tags: ['latest'] }));
    vi.stubGlobal('fetch', fetch);
    expect(await new Registry('https://registry.example', settings).tags('app')).toEqual(['latest']);
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer test-token');
  });
  it.each([401, 403, 404, 500])('reports an HTTP %s error', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
    await expect(new Registry('', { ...settings, secured: true }).catalog()).rejects.toMatchObject({ status });
  });
  it('reports network or CORS failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(new Registry('', settings).catalog()).rejects.toThrow('CORS');
  });
  it('does not issue an empty page request when a broken Link repeats', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ repositories: ['a'] }, { Link: '</v2/_catalog?n=2>; rel="next"' }));
    vi.stubGlobal('fetch', fetch);
    expect(await new Registry('', settings).catalog()).toEqual(['a']);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
describe('Image loading and deletion', () => {
  it.each([
    ['Docker manifest list', dockerManifestList],
    ['OCI image index', ociImageIndexManifest],
  ])('loads %s fixture platforms and retains the parent digest', async (_name, fixture) => {
    const root = Object.values(fixture).find((value: any) => Array.isArray(value.manifests)) as Manifest;
    const child = root.manifests![0];
    const manifest = {
      mediaType: 'application/vnd.oci.image.manifest.v1+json',
      config: { digest: 'sha256:abc', size: 1 },
      layers: [{ digest: 'sha256:def', size: 512 }],
    };
    const fetch = vi.fn(async (url: string) =>
      url.endsWith('/manifests/latest')
        ? json(root, { 'Docker-Content-Digest': 'sha256:parent' })
        : url.endsWith(`/manifests/${child.digest}`)
          ? json(manifest)
          : json({ created: '2024-01-01', os: 'linux', architecture: 'amd64', history: [{ created_by: 'RUN one' }] }),
    );
    vi.stubGlobal('fetch', fetch);
    const registry = new Registry('', settings),
      info = await registry.image('app', 'latest');
    expect(info.platforms).toHaveLength(2);
    expect(info.digest).toBe('sha256:parent');
    expect(info.size).toBe(512);
    expect(info.history[0].digest).toBe('sha256:def');
    await registry.image('app', 'latest');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('loads BuildKit layer indexes without treating layers as platforms', async () => {
    const root = ociImageIndexLayer['application/vnd.oci.image.index.v1+json'];
    const fetch = vi.fn().mockResolvedValue(json(root));
    vi.stubGlobal('fetch', fetch);
    const info = await new Registry('', settings).image('app', 'cache');
    expect(info.platforms).toEqual([]);
    expect(info.layers.length).toBe(root.manifests.length);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('deletes each parent digest once even when multiple tags share it', async () => {
    const fetch = vi.fn(async (_url: string, opts: RequestInit) =>
      opts.method === 'DELETE'
        ? new Response(null, { status: 202 })
        : json({ layers: [] }, { 'Docker-Content-Digest': 'sha256:abc' }),
    );
    vi.stubGlobal('fetch', fetch);
    await new Registry('', settings).deleteImages('app', ['one', 'two']);
    const deletes = fetch.mock.calls.filter((call) => call[1].method === 'DELETE');
    expect(deletes).toHaveLength(1);
    expect(deletes[0][0]).toBe('/v2/app/manifests/sha256:abc');
  });
  it('matches layer sizes to non-empty history entries', () => {
    expect(
      layerHistory({ history: [{ created_by: 'ENV a=b', empty_layer: true }, { created_by: 'RUN a' }] }, [
        { digest: 'sha256:a', size: 42 },
      ]),
    ).toEqual([
      { created_by: 'ENV a=b', empty_layer: true, size: undefined, digest: undefined },
      { created_by: 'RUN a', size: 42, digest: 'sha256:a' },
    ]);
  });
});

describe('Dockerfile reconstruction', () => {
  it('normalizes classic shell history and keeps BuildKit instructions', () => {
    expect(
      dockerfileInstructions([
        { created_by: '/bin/sh -c #(nop) ENV NODE_ENV=production' },
        { created_by: '/bin/sh -c apk add curl' },
        { created_by: 'COPY . /app # buildkit' },
        { empty_layer: true },
      ]),
    ).toBe('ENV NODE_ENV=production\nRUN apk add curl\nCOPY . /app # buildkit');
  });
});

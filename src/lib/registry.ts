import type { Settings } from './config';
import { RegistryError } from './error';
import {
  filterWrongManifests,
  layerHistory,
  supportListManifest,
  type ImageConfig,
  type ImageInfo,
  type Manifest,
} from './docker-image';
const ACCEPT =
  'application/vnd.docker.distribution.manifest.v2+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json';
type Result<T> = { data: T; headers: Headers; digest: string };
export async function mapLimit<T, R>(items: T[], mapper: (item: T) => Promise<R>, concurrency = 6): Promise<R[]> {
  const result = new Array<R>(items.length);
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (index < items.length) {
        const i = index++;
        result[i] = await mapper(items[i]);
      }
    }),
  );
  return result;
}
export class Registry {
  private cache = new Map<string, Promise<Result<unknown>>>();
  private tagRequests = new Map<string, Promise<string[]>>();
  private images = new Map<string, Promise<ImageInfo>>();
  private tokens = new Map<string, string>();
  constructor(
    public url: string,
    private settings: Pick<Settings, 'secured' | 'cacheControl' | 'catalogLimit'>,
  ) {}
  clear() {
    this.cache.clear();
    this.images.clear();
    this.tagRequests.clear();
  }
  async request<T>(path: string, method = 'GET'): Promise<Result<T>> {
    const key = method + path;
    const immutable = method === 'GET' && (/\/blobs\/sha256:[a-f0-9]+$/.test(path) || path.includes('/manifests/'));
    if (immutable && this.cache.has(key)) return this.cache.get(key) as Promise<Result<T>>;
    const task = this.fetchResult<T>(path, method);
    if (immutable) {
      this.cache.set(key, task);
      task.catch(() => this.cache.delete(key));
    }
    return task;
  }
  private async fetchResult<T>(path: string, method: string): Promise<Result<T>> {
    const url = this.url + path;
    const headers: Record<string, string> = { Accept: ACCEPT };
    if (this.settings.cacheControl) headers['Cache-Control'] = 'no-store, no-cache';
    const savedToken = this.tokens.get(path);
    if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
    let response: Response;
    try {
      response = await fetch(url, { method, headers, credentials: this.settings.secured ? 'include' : 'same-origin' });
      if (response.status === 401) {
        const auth = response.headers.get('www-authenticate') || '';
        const realm = /realm="([^"]+)"/.exec(auth)?.[1];
        if (/^Bearer /i.test(auth) && realm) {
          const tokenUrl = new URL(realm);
          ['service', 'scope'].forEach((key) => {
            const val = new RegExp(`${key}="([^"]+)"`).exec(auth)?.[1];
            if (val) tokenUrl.searchParams.set(key, val);
          });
          const tokenResponse = await fetch(tokenUrl, { credentials: 'include' });
          if (!tokenResponse.ok)
            throw new RegistryError('Authentication failed. Sign in to the registry in your browser.', 401);
          const tokenData = await tokenResponse.json();
          const token = tokenData.token || tokenData.access_token;
          if (!token) throw new RegistryError('The registry did not return an authentication token.', 401);
          this.tokens.set(path, token);
          headers.Authorization = `Bearer ${token}`;
        }
        if (!this.settings.secured || /^Bearer /i.test(auth)) {
          response = await fetch(url, { method, headers, credentials: 'include' });
        }
      }
    } catch (error) {
      if (error instanceof RegistryError) throw error;
      const mixed = typeof location !== 'undefined' && location.protocol === 'https:' && url.startsWith('http:');
      throw new RegistryError(
        mixed
          ? 'Mixed content blocked. Use an HTTPS registry.'
          : 'Registry unreachable. Check the connection and CORS headers (Access-Control-Allow-Origin and Access-Control-Allow-Credentials).',
      );
    }
    if (!response.ok) {
      const message =
        response.status === 401
          ? 'Authentication required. Open the registry in your browser and sign in.'
          : response.status === 403
            ? 'Access denied. Your registry does not allow this operation.'
            : response.status === 404
              ? 'Repository or manifest not found (404).'
              : `Registry request failed (${response.status}).`;
      throw new RegistryError(message, response.status);
    }
    const raw = await response.text();
    let digest = response.headers.get('Docker-Content-Digest') || '';
    if (!digest && path.includes('/manifests/') && method === 'GET' && globalThis.crypto?.subtle) {
      const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      digest = 'sha256:' + Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    let data: T;
    try {
      data = (raw ? JSON.parse(raw) : null) as T;
    } catch {
      throw new RegistryError(
        'The registry returned an invalid JSON response. Check the registry URL and proxy configuration.',
      );
    }
    return { data, headers: response.headers, digest };
  }
  private nextLink(header: string | null): string | undefined {
    if (!header) return;
    const link = header.split(',').find((item) => /rel="?next"?/.test(item));
    const target = link && /<([^>]+)>/.exec(link)?.[1];
    if (!target) return;
    const parsed = new URL(target, (this.url || globalThis.location?.origin || 'http://localhost') + '/');
    // Pagination may advertise a backend hostname behind the same-origin proxy.
    const apiIndex = parsed.pathname.indexOf('/v2/');
    return apiIndex >= 0 ? parsed.pathname.slice(apiIndex) + parsed.search : undefined;
  }
  async catalog(): Promise<string[]> {
    let path: string | undefined = `/v2/_catalog?n=${this.settings.catalogLimit}`;
    const repositories = new Set<string>(),
      seen = new Set<string>();
    while (path && !seen.has(path)) {
      seen.add(path);
      const res = await this.request<{ repositories: string[] | null }>(path);
      (res.data.repositories || []).forEach((repo) => repositories.add(repo));
      path = this.nextLink(res.headers.get('Link'));
    }
    return [...repositories].sort();
  }
  tags(name: string): Promise<string[]> {
    if (this.tagRequests.has(name)) return this.tagRequests.get(name)!;
    const task = this.loadTags(name);
    this.tagRequests.set(name, task);
    task.catch(() => this.tagRequests.delete(name));
    return task;
  }
  private async loadTags(name: string): Promise<string[]> {
    let path: string | undefined = `/v2/${name}/tags/list`;
    const tags = new Set<string>(),
      seen = new Set<string>();
    while (path && !seen.has(path)) {
      seen.add(path);
      const res = await this.request<{ tags: string[] | null }>(path);
      (res.data.tags || []).forEach((tag) => tags.add(tag));
      path = this.nextLink(res.headers.get('Link'));
    }
    return [...tags];
  }
  image(name: string, tag: string, platformDigest?: string): Promise<ImageInfo> {
    const key = `${name}:${tag}:${platformDigest || ''}`;
    if (this.images.has(key)) return this.images.get(key)!;
    const task = this.loadImage(name, tag, platformDigest);
    this.images.set(key, task);
    task.catch(() => this.images.delete(key));
    return task;
  }
  private async loadImage(name: string, tag: string, platformDigest?: string): Promise<ImageInfo> {
    const root = await this.request<Manifest>(`/v2/${name}/manifests/${tag}`);
    const platforms = supportListManifest(root.data) ? filterWrongManifests(root.data) : [];
    const selected = platformDigest || platforms[0]?.digest;
    const manifest = selected ? (await this.request<Manifest>(`/v2/${name}/manifests/${selected}`)).data : root.data;
    const layers = manifest.layers || manifest.manifests || [];
    const config = manifest.config?.digest
      ? (await this.request<ImageConfig>(`/v2/${name}/blobs/${manifest.config.digest}`)).data
      : undefined;
    return {
      tag,
      digest: root.digest,
      manifest: root.data,
      platforms,
      layers,
      config,
      size: layers.reduce((total, layer) => total + layer.size, 0),
      created: config?.created || manifest.annotations?.['org.opencontainers.image.created'],
      history: config ? layerHistory(config, layers) : [],
    };
  }
  async deleteImages(name: string, tags: string[]) {
    const images = await mapLimit(tags, (tag) => this.image(name, tag));
    const digests = [...new Set(images.map((image) => image.digest))];
    if (digests.some((digest) => !digest))
      throw new RegistryError(
        'Cannot delete: content digest unavailable. Expose Docker-Content-Digest in the registry CORS configuration.',
      );
    for (const digest of digests) await this.request(`/v2/${name}/manifests/${digest}`, 'DELETE');
    this.clear();
  }
}

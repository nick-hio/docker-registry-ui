import { describe, it, expect } from 'vitest';
import { layerHistory } from '../src/lib/docker-image';
import {
  buildLayerRows,
  formatCommand,
  getImageFacts,
  manifestKind,
  parseCreatedBy,
  timeAgo,
  toDockerfile,
} from '../src/lib/image-facts';
import { dockerManifestList } from './fixtures/docker-manifest-list.js';
import { ociImageIndexManifest } from './fixtures/oci-image-index-manifest.js';

describe('History parsing', () => {
  it('splits classic, BuildKit, and ARG-prefixed history entries', () => {
    expect(parseCreatedBy('/bin/sh -c #(nop)  CMD ["/bin/sh"]')).toEqual({
      instruction: 'CMD',
      command: '["/bin/sh"]',
    });
    expect(parseCreatedBy('/bin/sh -c apk add --no-cache curl')).toEqual({
      instruction: 'RUN',
      command: 'apk add --no-cache curl',
    });
    expect(parseCreatedBy('COPY dist/ /usr/share/nginx/html/ # buildkit')).toEqual({
      instruction: 'COPY',
      command: 'dist/ /usr/share/nginx/html/',
    });
    expect(parseCreatedBy('RUN |2 A=1 B=2 /bin/sh -c make # buildkit')).toEqual({
      instruction: 'RUN',
      command: 'make',
    });
  });
  it('rebuilds a Dockerfile from the layer rows', () => {
    const rows = buildLayerRows([
      { created_by: '/bin/sh -c #(nop) ENV NODE_ENV=production', empty_layer: true },
      { created_by: '/bin/sh -c apk add curl', digest: 'sha256:a', size: 1 },
      { created_by: 'COPY . /app # buildkit', digest: 'sha256:b', size: 2 },
    ]);
    expect(toDockerfile(rows)).toBe('ENV NODE_ENV=production\nRUN apk add curl\nCOPY . /app');
  });
});

describe('Layer rows', () => {
  it('matches every non-empty history entry with a manifest layer', () => {
    const { blobAmd64, manifestAmd64 } = ociImageIndexManifest;
    const rows = buildLayerRows(layerHistory(blobAmd64, manifestAmd64.layers), manifestAmd64.layers);
    expect(rows).toHaveLength(blobAmd64.history.length);
    const withLayer = rows.filter((row) => !row.empty);
    expect(withLayer.map((row) => row.digest)).toEqual(manifestAmd64.layers.map((layer) => layer.digest));
  });
  it('lists the manifest layers when the config has no history', () => {
    const rows = buildLayerRows([], [{ digest: 'sha256:a', size: 10 }]);
    expect(rows).toEqual([{ index: 0, instruction: '', command: '', size: 10, digest: 'sha256:a', empty: false }]);
  });
});

describe('Image facts', () => {
  it('extracts the config, moves the maintainer and custom labels out of the labels', () => {
    const facts = getImageFacts(dockerManifestList.blobAmd64, ['org.opencontainers.image.version']);
    expect(facts.author).toBe('Jones MAGLOIRE @Joxit');
    expect(facts.labels.find(([key]) => key === 'maintainer')).toBeUndefined();
    expect(facts.entrypoint).toBe('/docker-entrypoint.sh');
    expect(facts.cmd).toBe('nginx -g "daemon off;"');
    expect(facts.exposedPorts).toEqual(['80/tcp']);
    expect(facts.env).toContainEqual(['NGINX_LISTEN_PORT', '80']);
    expect(facts.platform).toBe('linux/amd64');
  });
  it('formats exec-form commands and manifest kinds', () => {
    expect(formatCommand(['sh', '-c', 'echo hi'])).toBe('sh -c "echo hi"');
    expect(formatCommand('nginx')).toBe('nginx');
    expect(manifestKind({ manifest: { mediaType: 'application/vnd.oci.image.index.v1+json' } })).toBe('OCI index');
    expect(manifestKind({ manifest: {} })).toBe('Image');
  });
  it('describes dates relative to now', () => {
    const now = Date.parse('2026-01-10T00:00:00Z');
    expect(timeAgo('2026-01-09T00:00:00Z', now)).toBe('yesterday');
    expect(timeAgo('not a date', now)).toBe('');
  });
});

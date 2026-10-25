import { describe, it, expect } from 'vitest';
import { cleanSetting, readConfig } from '../src/lib/config';
import { parseRoute, detailsRoute, repositoryRoute, queryRegistry } from '../src/lib/router';
describe('Runtime settings', () => {
  it('treats literal placeholders as unset', () => expect(cleanSetting('${REGISTRY_URL}')).toBe(''));
  it('preserves explicit false, zero branching, and page size', () => {
    const values = {
      'data-show-tag-history': 'false',
      'data-catalog-min-branches': '0',
      'data-catalog-max-branches': '0',
      'data-taglist-page-size': '20',
    };
    const element = { getAttribute: (key: string) => values[key as keyof typeof values] || null } as HTMLElement;
    expect(readConfig(element)).toMatchObject({ showHistory: false, minBranches: 0, maxBranches: 0, pageSize: 20 });
  });
});
describe('Shared hash routes', () => {
  it('accepts old repository and history routes', () => {
    expect(parseRoute('#!/taglist/apps/web')).toEqual({ repo: 'apps/web', tag: '' });
    expect(parseRoute('#!/taghistory/image/apps/web/tag/v1')).toEqual({ repo: 'apps/web', tag: 'v1' });
  });
  it('round trips encoded names and tags', () => {
    expect(parseRoute(detailsRoute('apps/web', 'v1+build'))).toEqual({ repo: 'apps/web', tag: 'v1+build' });
    expect(parseRoute(repositoryRoute('apps/web'))).toEqual({ repo: 'apps/web', tag: '' });
  });
  it('accepts encoded and legacy base64 registry URL queries', () => {
    const url = 'https://registry.example';
    expect(queryRegistry(`?url=${encodeURIComponent(url)}`)).toBe(url);
    expect(queryRegistry(`?url=${btoa(url)}`)).toBe(url);
  });
});

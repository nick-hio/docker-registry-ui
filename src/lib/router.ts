export type TagView = { tab?: string; platform?: string };
export type Route = { repo: string; tag: string } & TagView;
export const repositoryRoute = (repo: string) => `#/repositories/${encodeURIComponent(repo)}`;
export function detailsRoute(repo: string, tag: string, view: TagView = {}) {
  const query = new URLSearchParams();
  if (view.tab) query.set('tab', view.tab);
  if (view.platform) query.set('platform', view.platform);
  return `${repositoryRoute(repo)}/tags/${encodeURIComponent(tag)}${query.size ? `?${query}` : ''}`;
}
export function parseRoute(hash: string): Route {
  const queryIndex = hash.startsWith('#/') ? hash.indexOf('?') : -1;
  const path = queryIndex < 0 ? hash : hash.slice(0, queryIndex);
  const query = new URLSearchParams(queryIndex < 0 ? '' : hash.slice(queryIndex + 1));
  const oldDetails = /^#!\/taghistory\/image\/(.+)\/tag\/([^/]+)\/?$/.exec(path);
  const oldList = /^#!\/taglist\/(.+)$/.exec(path);
  const modern = /^#\/repositories\/([^/]+)(?:\/tags\/([^/]+))?$/.exec(path);
  try {
    if (oldDetails) return { repo: decodeURIComponent(oldDetails[1]), tag: decodeURIComponent(oldDetails[2]) };
    if (oldList) return { repo: decodeURIComponent(oldList[1]), tag: '' };
    if (!modern) return { repo: '', tag: '' };
    const route: Route = { repo: decodeURIComponent(modern[1]), tag: decodeURIComponent(modern[2] || '') };
    if (route.tag && query.get('tab')) route.tab = query.get('tab')!;
    if (route.tag && query.get('platform')) route.platform = query.get('platform')!;
    return route;
  } catch {
    return { repo: '', tag: '' };
  }
}
export function queryRegistry(search: string) {
  const value = new URLSearchParams(search).get('url');
  if (!value) return '';
  try {
    return value.startsWith('http') ? decodeURIComponent(value) : atob(value);
  } catch {
    return '';
  }
}

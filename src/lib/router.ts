export type Route = { repo: string; tag: string };
export const repositoryRoute = (repo: string) => `#/repositories/${encodeURIComponent(repo)}`;
export const detailsRoute = (repo: string, tag: string) => `${repositoryRoute(repo)}/tags/${encodeURIComponent(tag)}`;
export function parseRoute(hash: string): Route {
  const oldDetails = /^#!\/taghistory\/image\/(.+)\/tag\/([^/]+)\/?$/.exec(hash);
  const oldList = /^#!\/taglist\/(.+)$/.exec(hash);
  const modern = /^#\/repositories\/([^/]+)(?:\/tags\/([^/]+))?$/.exec(hash);
  try {
    return oldDetails
      ? { repo: decodeURIComponent(oldDetails[1]), tag: decodeURIComponent(oldDetails[2]) }
      : oldList
        ? { repo: decodeURIComponent(oldList[1]), tag: '' }
        : modern
          ? { repo: decodeURIComponent(modern[1]), tag: decodeURIComponent(modern[2] || '') }
          : { repo: '', tag: '' };
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

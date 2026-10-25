export function cleanSetting(value: string | null | undefined) {
  return !value || /^\$\{.*\}$/.test(value) ? '' : value;
}
export function readConfig(element = document.getElementById('registry-config')) {
  const get = (key: string) => cleanSetting(element?.getAttribute(`data-${key.toLowerCase().replaceAll('_', '-')}`));
  const bool = (key: string, fallback = false) => (get(key) ? get(key) === 'true' : fallback);
  const integer = (key: string, fallback: number, minimum = 1) => {
    const value = Number(get(key));
    return get(key) && Number.isInteger(value) && value >= minimum ? value : fallback;
  };
  return {
    title: get('DOCKER_REGISTRY_UI_TITLE') || 'Docker Registry UI',
    registryTitle: get('REGISTRY_TITLE'),
    registryUrl: get('REGISTRY_URL').replace(/\/+$/, ''),
    pullUrl: get('PULL_URL'),
    singleRegistry: bool('SINGLE_REGISTRY'),
    deleteImages: bool('DELETE_IMAGES'),
    showDigest: bool('SHOW_CONTENT_DIGEST'),
    showHistory: bool('SHOW_TAG_HISTORY', true),
    showCounts: bool('SHOW_CATALOG_NB_TAGS'),
    catalogLimit: integer('CATALOG_ELEMENTS_LIMIT', 1000),
    pageSize: integer('TAGLIST_PAGE_SIZE', 100),
    defaultExpanded: bool('CATALOG_DEFAULT_EXPANDED'),
    minBranches: integer('CATALOG_MIN_BRANCHES', 1, 0),
    maxBranches: integer('CATALOG_MAX_BRANCHES', 1, 0),
    tagOrder: get('TAGLIST_ORDER'),
    secured: bool('REGISTRY_SECURED'),
    cacheControl: bool('USE_CONTROL_CACHE_HEADER'),
    defaultRegistries: get('DEFAULT_REGISTRIES')
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean),
    readOnlyRegistries: bool('READ_ONLY_REGISTRIES'),
    customLabels: get('HISTORY_CUSTOM_LABELS')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    theme: get('THEME') || 'auto',
    themeColors: Object.fromEntries(
      [
        'PRIMARY_TEXT',
        'NEUTRAL_TEXT',
        'BACKGROUND',
        'HOVER_BACKGROUND',
        'ACCENT_TEXT',
        'HEADER_TEXT',
        'HEADER_ACCENT_TEXT',
        'HEADER_BACKGROUND',
        'FOOTER_TEXT',
        'FOOTER_NEUTRAL_TEXT',
        'FOOTER_BACKGROUND',
      ]
        .map((k) => [k, get(`THEME_${k}`)])
        .filter(([, v]) => v),
    ) as Record<string, string>,
  };
}
export type Settings = ReturnType<typeof readConfig>;

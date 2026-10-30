import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Boxes,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  Folder,
  Package,
  Plus,
  RefreshCw,
  Server,
  Tag,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { readConfig } from '@/lib/config';
import { Registry, mapLimit } from '@/lib/registry';
import { getTagComparator, taglistOrderParser } from '@/lib/taglist-order';
import { platformLabel, type ImageInfo } from '@/lib/docker-image';
import { bytesToSize, dateFormat, getRegistryServers, setRegistryServers, stripHttps } from '@/lib/utils-registry';
import { detailsRoute, parseRoute, queryRegistry, repositoryRoute } from '@/lib/router';
import { useRegistryTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ExplorerSidebar } from '@/components/explorer-sidebar';
const TagPage = lazy(() => import('@/components/tag-page').then((module) => ({ default: module.TagPage })));
import { CopyButton, ErrorNotice, LoadingRows, NoResults, PullCommand, SearchInput } from '@/components/common';
import { cn } from '@/lib/utils';
const settings = readConfig();
const savedRegistries = getRegistryServers();
const initialRegistries = settings.readOnlyRegistries
  ? settings.defaultRegistries
  : savedRegistries.length
    ? savedRegistries
    : settings.defaultRegistries;
const plural = (n: number, word: string) =>
  `${n} ${n === 1 ? word : word === 'repository' ? 'repositories' : word + 's'}`;
const getMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
type SortKey = 'tag' | 'created' | 'size' | 'platform';
export default function App() {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const [url, setUrl] = useState(
    () =>
      settings.registryUrl ||
      (settings.singleRegistry ? '' : queryRegistry(location.search) || initialRegistries[0] || ''),
  );
  const [registries, setRegistries] = useState(initialRegistries);
  const [repositories, setRepositories] = useState<string[]>([]),
    [counts, setCounts] = useState<Record<string, number>>({});
  const [catalogBusy, setCatalogBusy] = useState(true),
    [catalogError, setCatalogError] = useState(''),
    [countError, setCountError] = useState('');
  const [revision, setRevision] = useState(0),
    [filter, setFilter] = useState(''),
    [namespace, setNamespace] = useState('all');
  const [tagOwner, setTagOwner] = useState('');
  const [tags, setTags] = useState<string[]>([]),
    [tagBusy, setTagBusy] = useState(false),
    [tagError, setTagError] = useState('');
  const [tagFilter, setTagFilter] = useState(''),
    [page, setPage] = useState(() => Math.max(1, Number(new URLSearchParams(location.search).get('page')) || 1)),
    [pageSize, setPageSize] = useState(settings.pageSize);
  const [metadata, setMetadata] = useState<Record<string, ImageInfo>>({}),
    [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'tag', desc: false });
  const [selected, setSelected] = useState<string[]>([]),
    [deleteTags, setDeleteTags] = useState<string[]>([]),
    [deleteBusy, setDeleteBusy] = useState(false),
    [deleteError, setDeleteError] = useState('');
  const [registryDialog, setRegistryDialog] = useState(false),
    [registryInput, setRegistryInput] = useState(''),
    [registryInputError, setRegistryInputError] = useState(''),
    [removeDialog, setRemoveDialog] = useState(false);
  const registry = useMemo(() => new Registry(url, settings), [url]);
  const { dark, toggle } = useRegistryTheme(settings);
  const registryTitle =
    (url === settings.registryUrl && settings.registryTitle) ||
    (url ? stripHttps(url) : settings.registryTitle || 'Registry');
  useEffect(() => {
    document.title = `${route.tag ? `${route.repo}:${route.tag}` : route.repo || registryTitle} · ${settings.title}`;
  }, [registryTitle, route.repo, route.tag]);
  useEffect(() => {
    const update = () => {
      const next = parseRoute(location.hash);
      setRoute(next);
      if (location.hash.startsWith('#!'))
        history.replaceState(
          null,
          '',
          location.pathname +
            location.search +
            (next.tag ? detailsRoute(next.repo, next.tag) : next.repo ? repositoryRoute(next.repo) : '#/'),
        );
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (((e.ctrlKey || e.metaKey) && e.key === 'f') || e.key === 'F3') {
        const input = document.getElementById(route.repo ? 'tag-filter' : 'repository-filter');
        if (input && document.activeElement !== input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [route.repo]);
  useEffect(() => {
    let live = true;
    setCatalogBusy(true);
    setCatalogError('');
    setCountError('');
    setRepositories([]);
    setCounts({});
    registry
      .catalog()
      .then(async (repos) => {
        if (!live) return;
        setRepositories(repos);
        setCatalogBusy(false);
        if (settings.showCounts)
          await mapLimit(repos, async (repo) => {
            try {
              const result = await registry.tags(repo);
              if (live) setCounts((previous) => ({ ...previous, [repo]: result.length }));
            } catch (error) {
              if (live) setCountError(getMessage(error));
            }
          });
      })
      .catch((error) => {
        if (live) {
          setCatalogError(getMessage(error));
          setCatalogBusy(false);
        }
      });
    return () => {
      live = false;
    };
  }, [registry, revision]);
  useEffect(() => {
    let live = true;
    setTagOwner('');
    setTags([]);
    setMetadata({});
    setSelected([]);
    setTagFilter('');
    setSort({ key: 'tag', desc: false });
    setTagError('');
    if (!route.repo) {
      setTagBusy(false);
      return;
    }
    setTagBusy(true);
    registry
      .tags(route.repo)
      .then((result) => {
        if (live) {
          setTagOwner(route.repo);
          setTags(result);
          setCounts((previous) => ({ ...previous, [route.repo]: result.length }));
          setPage((p) => Math.min(p, Math.max(1, Math.ceil(result.length / pageSize))));
        }
      })
      .catch((error) => {
        if (live) setTagError(getMessage(error));
      })
      .finally(() => {
        if (live) setTagBusy(false);
      });
    return () => {
      live = false;
    };
  }, [route.repo, registry, revision]);
  const comparator = useMemo(() => {
    try {
      return getTagComparator(taglistOrderParser(settings.tagOrder));
    } catch (error) {
      toast.error(getMessage(error));
      return getTagComparator(taglistOrderParser());
    }
  }, []);
  const filteredTags = useMemo(
    () =>
      tags
        .filter((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()))
        .sort((a, b) => {
          let result = 0;
          if (sort.key === 'tag') result = comparator(a, b);
          if (sort.key === 'size') result = (metadata[a]?.size || 0) - (metadata[b]?.size || 0);
          if (sort.key === 'created')
            result = new Date(metadata[a]?.created || 0).getTime() - new Date(metadata[b]?.created || 0).getTime();
          if (sort.key === 'platform')
            result = platformLabel(metadata[a]?.config).localeCompare(platformLabel(metadata[b]?.config));
          return (result || comparator(a, b)) * (sort.desc ? -1 : 1);
        }),
    [tags, tagFilter, sort, metadata, comparator],
  );
  const pageCount = Math.max(1, Math.ceil(filteredTags.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageTags = filteredTags.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const showTagPage = !!route.tag && settings.showHistory;
  const loadTags = tagOwner === route.repo && !showTagPage ? (sort.key === 'tag' ? pageTags : filteredTags) : [];
  const loadKey = JSON.stringify(loadTags);
  useEffect(() => {
    if (!route.repo || !loadTags.length) return;
    let live = true;
    mapLimit(loadTags, async (tag) => {
      try {
        const info = await registry.image(route.repo, tag);
        if (live) setMetadata((previous) => (previous[tag] === info ? previous : { ...previous, [tag]: info }));
      } catch (error) {
        if (live) setMetadata((previous) => ({ ...previous, [tag]: { tag, error: getMessage(error) } as ImageInfo }));
      }
    });
    return () => {
      live = false;
    };
  }, [loadKey, route.repo, registry, revision]);
  const visibleRepositories = repositories.filter(
    (repo) => (!settings.showCounts || counts[repo] !== 0) && repo.toLowerCase().includes(filter.toLowerCase()),
  );
  const namespaces = [
    ...new Set(
      visibleRepositories.map((repo) => (repo.includes('/') ? repo.slice(0, repo.lastIndexOf('/')) : 'library')),
    ),
  ].sort();
  const catalogRows = visibleRepositories.filter(
    (repo) =>
      namespace === 'all' || (repo.includes('/') ? repo.slice(0, repo.lastIndexOf('/')) : 'library') === namespace,
  );
  const totalTags = visibleRepositories.reduce((sum, repo) => sum + (counts[repo] || 0), 0);
  const countsReady = visibleRepositories.every((repo) => counts[repo] !== undefined);
  const pullHost = stripHttps(settings.pullUrl || url || location.host);
  const pull = (tag?: string) => `docker pull ${pullHost}/${route.repo}${tag ? `:${tag}` : ''}`;
  function changeRegistry(value: string) {
    setUrl(value);
    setFilter('');
    setNamespace('all');
    setPage(1);
    const query = new URLSearchParams(location.search);
    if (value) query.set('url', value);
    else query.delete('url');
    query.delete('page');
    history.replaceState(null, '', location.pathname + (query.size ? `?${query}` : '') + '#/');
    setRoute({ repo: '', tag: '' });
  }
  function refresh() {
    registry.clear();
    setRevision((v) => v + 1);
  }
  function updatePage(value: number) {
    setPage(value);
    setSelected([]);
    const query = new URLSearchParams(location.search);
    query.set('page', String(value));
    history.replaceState(null, '', location.pathname + `?${query}` + location.hash);
  }
  function selectTag(tag: string, checked: boolean) {
    setSelected((previous) => (checked ? [...new Set([...previous, tag])] : previous.filter((t) => t !== tag)));
  }
  function changeSort(key: SortKey) {
    setSort((previous) => ({ key, desc: previous.key === key ? !previous.desc : key === 'created' }));
    setPage(1);
  }
  function sortHeading(key: SortKey, label: string) {
    return (
      <Button variant="ghost" size="sm" className="sort-button" onClick={() => changeSort(key)}>
        {label}
        {sort.key === key ? sort.desc ? <ArrowDown /> : <ArrowUp /> : <ArrowUpDown />}
      </Button>
    );
  }
  function addRegistry(e: React.FormEvent) {
    e.preventDefault();
    let value = registryInput.trim().replace(/\/+$/, '');
    try {
      const parsed = new URL(value);
      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash
      )
        throw new Error();
      value = parsed.href.replace(/\/+$/, '');
    } catch {
      setRegistryInputError('Enter an HTTP or HTTPS registry URL without credentials, query, or fragment.');
      return;
    }
    const next = [...new Set([value, ...registries])];
    setRegistries(next);
    setRegistryServers(next);
    setRegistryDialog(false);
    setRegistryInput('');
    changeRegistry(value);
  }
  async function confirmDelete() {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await registry.deleteImages(route.repo, deleteTags);
      setDeleteTags([]);
      setSelected([]);
      toast.success('Images deleted');
      if (route.tag && deleteTags.includes(route.tag)) location.hash = repositoryRoute(route.repo);
      refresh();
    } catch (error) {
      setDeleteError(getMessage(error));
      refresh();
    } finally {
      setDeleteBusy(false);
    }
  }
  function requestDelete(values: string[]) {
    setDeleteError('');
    setDeleteTags(values);
  }
  const crumbs = route.repo ? route.repo.split('/') : [];
  return (
    <TooltipProvider>
      <SidebarProvider style={{ '--sidebar-width': '18rem' } as React.CSSProperties}>
        <ExplorerSidebar
          settings={settings}
          title={registryTitle}
          url={url}
          registries={registries}
          repositories={visibleRepositories}
          counts={counts}
          active={route.repo}
          filter={filter}
          setFilter={setFilter}
          onRegistry={changeRegistry}
          onAdd={() => {
            setRegistryInputError('');
            setRegistryDialog(true);
          }}
          onRemove={() => setRemoveDialog(true)}
          dark={dark}
          onTheme={toggle}
          connected={!catalogBusy && !catalogError}
          failed={!!catalogError}
        />
        <SidebarInset className="app-main">
          <header className="topbar">
            <SidebarTrigger aria-label="Toggle repository explorer" />
            <Separator orientation="vertical" className="h-4" />
            <nav aria-label="Breadcrumb" className="breadcrumbs">
              <a href="#/">{registryTitle}</a>
              <ChevronRight />
              {route.repo ? (
                <>
                  <a href="#/">Repositories</a>
                  {crumbs.map((part, i) => (
                    <span key={i} className="crumb">
                      <ChevronRight />
                      {showTagPage && i === crumbs.length - 1 ? (
                        <a href={repositoryRoute(route.repo)} title={route.repo}>
                          {part}
                        </a>
                      ) : (
                        <span title={part}>{part}</span>
                      )}
                    </span>
                  ))}
                  {showTagPage && (
                    <span className="crumb">
                      <ChevronRight />
                      <span title={route.tag}>{route.tag}</span>
                    </span>
                  )}
                </>
              ) : (
                <span>Repositories</span>
              )}
            </nav>
            <div className="topbar-actions">
              <Badge variant="outline" className="connection-badge">
                <span className={cn('status-dot', catalogError && 'offline', catalogBusy && 'pending')} />
                {catalogError ? 'Offline' : catalogBusy ? 'Connecting' : 'Connected'}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Refresh registry"
                title="Refresh registry"
                onClick={refresh}
                disabled={catalogBusy}
              >
                <RefreshCw className={cn(catalogBusy && 'animate-spin')} />
              </Button>
            </div>
          </header>
          <div className="workspace">
            {showTagPage ? (
              <Suspense fallback={<LoadingRows />}>
                <TagPage
                  key={`${url}:${route.repo}:${route.tag}:${revision}`}
                  registry={registry}
                  repo={route.repo}
                  tag={route.tag}
                  view={{ tab: route.tab, platform: route.platform }}
                  settings={settings}
                  pullHost={pullHost}
                  onDelete={(tag) => requestDelete([tag])}
                />
              </Suspense>
            ) : !route.repo ? (
              <>
                <div className="page-heading">
                  <div className="page-title">
                    <span className="page-icon">
                      <Boxes />
                    </span>
                    <h1>Repositories</h1>
                    <Badge variant="secondary">{visibleRepositories.length}</Badge>
                  </div>
                  <Badge variant="outline" className="registry-kind">
                    <Server />
                    Registry v2
                  </Badge>
                </div>
                <div className="registry-summary">
                  <div>
                    <Package />
                    <strong>{visibleRepositories.length}</strong>
                    <span>{visibleRepositories.length === 1 ? 'repository' : 'repositories'}</span>
                  </div>
                  <Separator orientation="vertical" />
                  <div>
                    <Folder />
                    <strong>{namespaces.length}</strong>
                    <span>{namespaces.length === 1 ? 'namespace' : 'namespaces'}</span>
                  </div>
                  {settings.showCounts && (
                    <>
                      <Separator orientation="vertical" />
                      <div>
                        <Tag />
                        <strong>{countsReady ? totalTags : '—'}</strong>
                        <span>{totalTags === 1 ? 'tag' : 'tags'}</span>
                      </div>
                    </>
                  )}
                </div>
                {catalogError && <ErrorNotice message={catalogError} />}{' '}
                {countError && <ErrorNotice message={`Some tag counts are unavailable. ${countError}`} />}
                <section className="data-panel" aria-label="Repository catalog">
                  <div className="panel-toolbar">
                    <div className="catalog-search">
                      <SearchInput
                        value={filter}
                        onChange={(value) => {
                          setFilter(value);
                          setNamespace('all');
                        }}
                        label="Find a repository"
                      />
                    </div>
                    <Select value={namespace} onValueChange={setNamespace}>
                      <SelectTrigger aria-label="Filter namespace" className="namespace-select">
                        <Folder />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="all">All namespaces</SelectItem>
                          {namespaces.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  {catalogBusy ? (
                    <LoadingRows />
                  ) : catalogRows.length ? (
                    <Table className="catalog-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Repository</TableHead>
                          <TableHead className="namespace-column">Namespace</TableHead>
                          {settings.showCounts && <TableHead className="count-column">Tags</TableHead>}
                          <TableHead className="w-12">
                            <span className="sr-only">Open repository</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catalogRows.map((repo) => {
                          const split = repo.lastIndexOf('/');
                          return (
                            <TableRow key={repo}>
                              <TableCell>
                                <a className="repository-link" href={repositoryRoute(repo)} title={repo}>
                                  <span className="repo-glyph">
                                    <Package />
                                  </span>
                                  <span className="repo-name">
                                    {split >= 0 && <span className="repo-prefix">{repo.slice(0, split + 1)}</span>}
                                    <strong>{repo.slice(split + 1)}</strong>
                                  </span>
                                </a>
                              </TableCell>
                              <TableCell className="namespace-column">
                                <Badge variant="outline">
                                  <Folder />
                                  {split >= 0 ? repo.slice(0, split) : 'library'}
                                </Badge>
                              </TableCell>
                              {settings.showCounts && (
                                <TableCell className="count-column">
                                  <Badge variant="secondary">{counts[repo] ?? '…'}</Badge>
                                </TableCell>
                              )}
                              <TableCell>
                                <Button variant="ghost" size="icon-sm" asChild>
                                  <a href={repositoryRoute(repo)} aria-label={`Open ${repo}`}>
                                    <ArrowUpRight />
                                  </a>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <NoResults
                      title={filter ? 'No matching repositories' : 'No repositories'}
                      onReset={
                        filter
                          ? () => {
                              setFilter('');
                              setNamespace('all');
                            }
                          : undefined
                      }
                    />
                  )}
                  <div className="panel-footer">
                    <span>{plural(catalogRows.length, 'repository')}</span>
                    <span>{settings.showCounts ? 'Empty repositories hidden' : 'Catalog'}</span>
                  </div>
                </section>
                <section className="registry-inspector" aria-label="Registry connection">
                  <div className="inspector-title">
                    <Server />
                    <span>Registry</span>
                  </div>
                  <div className="inspector-grid">
                    <div>
                      <span>Endpoint</span>
                      <code title={url || location.origin}>{url || location.origin}</code>
                      <CopyButton value={url || location.origin} label="Copy registry endpoint" />
                    </div>
                    <div>
                      <span>API</span>
                      <strong>Docker Registry v2</strong>
                    </div>
                    <div>
                      <span>Connection</span>
                      <strong>
                        <span className={cn('status-dot', catalogError && 'offline', catalogBusy && 'pending')} />
                        {catalogError ? 'Unreachable' : catalogBusy ? 'Connecting' : 'Connected'}
                      </strong>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <div className="page-heading repository-heading">
                  <div className="page-title">
                    <span className="page-icon">
                      <Package />
                    </span>
                    <h1 title={route.repo}>{route.repo}</h1>
                  </div>
                  <Badge variant="secondary">{plural(tags.length, 'tag')}</Badge>
                </div>
                <PullCommand command={pull()} />
                {tagError && <ErrorNotice message={tagError} />}
                <section className="data-panel" aria-label="Repository tags">
                  <div className="panel-toolbar">
                    <div className="tag-tab">
                      <Tag />
                      <span>Tags</span>
                      <Badge variant="secondary">{tags.length}</Badge>
                    </div>
                    <div className="tags-search">
                      <SearchInput
                        value={tagFilter}
                        onChange={(value) => {
                          setTagFilter(value);
                          setPage(1);
                          setSelected([]);
                        }}
                        label="Filter tags"
                        id="tag-filter"
                      />
                    </div>
                    {settings.deleteImages && selected.length > 0 && (
                      <Button variant="destructive" onClick={() => requestDelete(selected)}>
                        <Trash2 data-icon="inline-start" />
                        Delete {selected.length}
                      </Button>
                    )}
                  </div>
                  {tagBusy ? (
                    <LoadingRows />
                  ) : pageTags.length ? (
                    <Table className="tags-table">
                      <TableHeader>
                        <TableRow>
                          {settings.deleteImages && (
                            <TableHead className="checkbox-column">
                              <Checkbox
                                aria-label="Select all tags on this page"
                                checked={
                                  pageTags.every((tag) => selected.includes(tag))
                                    ? true
                                    : pageTags.some((tag) => selected.includes(tag))
                                      ? 'indeterminate'
                                      : false
                                }
                                onCheckedChange={(checked) =>
                                  setSelected(
                                    checked
                                      ? [...new Set([...selected, ...pageTags])]
                                      : selected.filter((tag) => !pageTags.includes(tag)),
                                  )
                                }
                              />
                            </TableHead>
                          )}
                          <TableHead aria-sort={sort.key === 'tag' ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
                            {sortHeading('tag', 'Tag')}
                          </TableHead>
                          <TableHead
                            className="date-column"
                            aria-sort={sort.key === 'created' ? (sort.desc ? 'descending' : 'ascending') : 'none'}
                          >
                            {sortHeading('created', 'Created')}
                          </TableHead>
                          <TableHead
                            className="size-column"
                            aria-sort={sort.key === 'size' ? (sort.desc ? 'descending' : 'ascending') : 'none'}
                          >
                            {sortHeading('size', 'Size')}
                          </TableHead>
                          <TableHead
                            className="platform-column"
                            aria-sort={sort.key === 'platform' ? (sort.desc ? 'descending' : 'ascending') : 'none'}
                          >
                            {sortHeading('platform', 'Platform')}
                          </TableHead>
                          {settings.showDigest && <TableHead className="digest-column">Content digest</TableHead>}
                          <TableHead className="actions-column">
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageTags.map((tag) => {
                          const info = metadata[tag];
                          return (
                            <TableRow key={tag} data-state={selected.includes(tag) ? 'selected' : undefined}>
                              {settings.deleteImages && (
                                <TableCell className="checkbox-column">
                                  <Checkbox
                                    aria-label={`Select ${tag}`}
                                    checked={selected.includes(tag)}
                                    onCheckedChange={(checked) => selectTag(tag, !!checked)}
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="tag-name-cell">
                                  {settings.showHistory ? (
                                    <a href={detailsRoute(route.repo, tag)} className="tag-link" title={tag}>
                                      <Tag />
                                      <strong>{tag}</strong>
                                    </a>
                                  ) : (
                                    <span title={tag} className="tag-link">
                                      <Tag />
                                      <strong>{tag}</strong>
                                    </span>
                                  )}
                                  <div className="mobile-tag-meta">
                                    {dateFormat(info?.created)}
                                    <span>·</span>
                                    {bytesToSize(info?.size)}
                                  </div>
                                  {info?.error && (
                                    <span title={info.error} className="tag-error">
                                      <TriangleAlert className="size-3" />
                                      {info.error}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="date-column">
                                <time title={info?.created}>{info ? dateFormat(info.created) : '…'}</time>
                              </TableCell>
                              <TableCell className="size-column">{info ? bytesToSize(info.size) : '…'}</TableCell>
                              <TableCell className="platform-column">
                                <div className="platform-badges">
                                  {info?.platforms?.length ? (
                                    <>
                                      <Badge variant="outline">{platformLabel(info.platforms[0].platform)}</Badge>
                                      {info.platforms.length > 1 && (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="xs"
                                              className="platform-overflow"
                                              aria-label={`Show all ${info.platforms.length} platforms for ${tag}`}
                                            >
                                              +{info.platforms.length - 1}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="platform-popover" align="start">
                                            <PopoverHeader>
                                              <PopoverTitle>
                                                Platforms <Badge variant="secondary">{info.platforms.length}</Badge>
                                              </PopoverTitle>
                                            </PopoverHeader>
                                            <div className="platform-list">
                                              {info.platforms.map((m) => (
                                                <Badge variant="outline" key={m.digest}>
                                                  {platformLabel(m.platform)}
                                                </Badge>
                                              ))}
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                    </>
                                  ) : info?.config ? (
                                    <Badge variant="outline">{platformLabel(info.config)}</Badge>
                                  ) : (
                                    <span>…</span>
                                  )}
                                </div>
                              </TableCell>
                              {settings.showDigest && (
                                <TableCell className="digest-column">
                                  <div className="digest-cell">
                                    <code title={info?.digest}>{info?.digest || '…'}</code>
                                    {info?.digest && (
                                      <CopyButton value={info.digest} label={`Copy digest for ${tag}`} />
                                    )}
                                  </div>
                                </TableCell>
                              )}
                              <TableCell className="actions-column">
                                <div className="row-actions">
                                  <CopyButton value={pull(tag)} label={`Copy pull command for ${tag}`} />
                                  {settings.deleteImages && (
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Delete ${tag}`}
                                      title={`Delete ${tag}`}
                                      onClick={() => requestDelete([tag])}
                                    >
                                      <Trash2 />
                                    </Button>
                                  )}
                                  {settings.showHistory && (
                                    <Button variant="ghost" size="icon-sm" asChild>
                                      <a
                                        href={detailsRoute(route.repo, tag)}
                                        aria-label={`Inspect ${tag}`}
                                        title="Inspect tag"
                                      >
                                        <ChevronRight />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <NoResults
                      title={tagFilter ? 'No matching tags' : 'No tags'}
                      onReset={tagFilter ? () => setTagFilter('') : undefined}
                    />
                  )}
                  <div className="table-pagination">
                    <span className="pagination-count">
                      {filteredTags.length
                        ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredTags.length)} of ${filteredTags.length}`
                        : '0 tags'}
                    </span>
                    <div className="page-size">
                      <span>Rows</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                          setPage(1);
                          setSelected([]);
                        }}
                      >
                        <SelectTrigger aria-label="Tags per page">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {[...new Set([10, 20, 50, 100, settings.pageSize])]
                              .sort((a, b) => a - b)
                              .map((value) => (
                                <SelectItem key={value} value={String(value)}>
                                  {value}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="First page"
                            disabled={currentPage === 1}
                            onClick={() => updatePage(1)}
                          >
                            <ChevronsLeft />
                          </Button>
                        </PaginationItem>
                        <PaginationItem>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Previous page"
                            disabled={currentPage === 1}
                            onClick={() => updatePage(currentPage - 1)}
                          >
                            <ChevronLeft />
                          </Button>
                        </PaginationItem>
                        {Array.from({ length: pageCount }, (_, i) => i + 1)
                          .filter((p) => Math.abs(p - currentPage) <= 1 || p === 1 || p === pageCount)
                          .flatMap((p, i, arr) => {
                            const node = (
                              <PaginationItem key={p}>
                                <PaginationLink
                                  href="#"
                                  isActive={p === currentPage}
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    updatePage(p);
                                  }}
                                >
                                  {p}
                                </PaginationLink>
                              </PaginationItem>
                            );
                            return i > 0 && p - arr[i - 1] > 1
                              ? [
                                  <PaginationItem key={`gap${p}`}>
                                    <PaginationEllipsis />
                                  </PaginationItem>,
                                  node,
                                ]
                              : [node];
                          })}
                        <PaginationItem>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Next page"
                            disabled={currentPage === pageCount}
                            onClick={() => updatePage(currentPage + 1)}
                          >
                            <ChevronRight />
                          </Button>
                        </PaginationItem>
                        <PaginationItem>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Last page"
                            disabled={currentPage === pageCount}
                            onClick={() => updatePage(pageCount)}
                          >
                            <ChevronsRight />
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </section>
              </>
            )}
          </div>
          <footer className="statusbar">
            <span className="statusbar-location">
              <Server />
              {registryTitle}
            </span>
            <span className="statusbar-detail">
              {route.repo ? plural(tags.length, 'tag') : plural(visibleRepositories.length, 'repository')}
            </span>
            <span className="statusbar-version">
              <span className={cn('status-dot', catalogError && 'offline', catalogBusy && 'pending')} />
              Registry API v2
            </span>
          </footer>
        </SidebarInset>
        <AlertDialog
          open={deleteTags.length > 0}
          onOpenChange={(open) => {
            if (!open && !deleteBusy) setDeleteTags([]);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="delete-icon">
                <Trash2 />
              </div>
              <AlertDialogTitle>Delete {plural(deleteTags.length, 'tag')}?</AlertDialogTitle>
              <AlertDialogDescription>
                Images are deleted by digest. All tags that share these digests will also be removed. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="delete-tag-list">
              <div className="delete-repo">
                <Package />
                <span title={route.repo}>{route.repo}</span>
              </div>
              {deleteTags.map((tag) => (
                <div key={tag}>
                  <Tag />
                  <code title={tag}>{tag}</code>
                </div>
              ))}
            </div>
            {deleteError && <ErrorNotice message={deleteError} />}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
              <Button variant="destructive" disabled={deleteBusy} onClick={confirmDelete}>
                <Trash2 data-icon="inline-start" />
                {deleteBusy ? 'Deleting…' : `Delete ${plural(deleteTags.length, 'tag')}`}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={registryDialog} onOpenChange={setRegistryDialog}>
          <DialogContent aria-describedby={undefined}>
            <form onSubmit={addRegistry}>
              <DialogHeader>
                <DialogTitle>Add registry</DialogTitle>
              </DialogHeader>
              <FieldGroup className="py-6">
                <Field data-invalid={!!registryInputError}>
                  <FieldLabel htmlFor="registry-url">Registry URL</FieldLabel>
                  <Input
                    id="registry-url"
                    type="url"
                    placeholder="https://registry.example.com"
                    value={registryInput}
                    onChange={(e) => {
                      setRegistryInput(e.target.value);
                      setRegistryInputError('');
                    }}
                    aria-invalid={!!registryInputError}
                    required
                  />
                  {registryInputError && (
                    <p role="alert" className="field-error">
                      {registryInputError}
                    </p>
                  )}
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRegistryDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Plus data-icon="inline-start" />
                  Add registry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <AlertDialog open={removeDialog} onOpenChange={setRemoveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove registry?</AlertDialogTitle>
              <AlertDialogDescription>{url}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => {
                  const next = registries.filter((value) => value !== url);
                  setRegistries(next);
                  setRegistryServers(next);
                  changeRegistry('');
                  setRemoveDialog(false);
                }}
              >
                Remove registry
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Toaster theme={dark ? 'dark' : 'light'} position="bottom-right" />
      </SidebarProvider>
    </TooltipProvider>
  );
}

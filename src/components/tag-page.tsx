import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  Calendar,
  Check,
  CircleUser,
  Cpu,
  FileCode,
  FileJson,
  Folder,
  HardDrive,
  Hash,
  Layers3,
  List,
  ListTree,
  LogIn,
  Network,
  OctagonX,
  PackageX,
  Play,
  Tag,
  Tags,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { Registry } from '@/lib/registry';
import type { Settings } from '@/lib/config';
import { platformLabel, type Descriptor, type ImageInfo } from '@/lib/docker-image';
import {
  buildLayerRows,
  dateTimeFormat,
  getImageFacts,
  manifestKind,
  timeAgo,
  toDockerfile,
  type ImageFacts,
  type LayerRow,
} from '@/lib/image-facts';
import { detailsRoute, type TagView } from '@/lib/router';
import { bytesToSize } from '@/lib/utils-registry';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CopyButton, ErrorNotice, PullCommand } from './common';

const TABS = ['overview', 'layers', 'config', 'platforms'] as const;
type TabName = (typeof TABS)[number];

const getMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

function TimeAgo({ value }: { value?: string }) {
  if (!timeAgo(value)) return <>—</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="truncate rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          {timeAgo(value)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{dateTimeFormat(value)}</TooltipContent>
    </Tooltip>
  );
}

function StatCard({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <Card size="sm" className="stat-card">
      <CardHeader className="gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <CardDescription className="truncate text-xs font-medium">{label}</CardDescription>
          <span className="stat-card-icon">
            <Icon />
          </span>
        </div>
        <CardTitle className="flex min-w-0 text-lg font-semibold tracking-tight tabular-nums">{children}</CardTitle>
      </CardHeader>
    </Card>
  );
}

type Fact = { label: string; icon: LucideIcon; value: ReactNode; wide?: boolean; copy?: string };

const Mono = ({ children }: { children: ReactNode }) => <code className="text-xs break-all">{children}</code>;

function OverviewPanel({
  info,
  facts,
  platformDigest,
}: {
  info: ImageInfo;
  facts: ImageFacts;
  platformDigest?: string;
}) {
  const list: (Fact | false | undefined | '')[] = [
    { label: 'Content digest', icon: Hash, value: <Mono>{info.digest || '—'}</Mono>, copy: info.digest, wide: true },
    !!platformDigest && {
      label: 'Platform digest',
      icon: Hash,
      value: <Mono>{platformDigest}</Mono>,
      copy: platformDigest,
      wide: true,
    },
    !!info.configDigest && {
      label: 'Config digest',
      icon: FileJson,
      value: <Mono>{info.configDigest}</Mono>,
      copy: info.configDigest,
      wide: true,
    },
    !!facts.created && {
      label: 'Created',
      icon: Calendar,
      value: (
        <span>
          {dateTimeFormat(facts.created)} <span className="text-muted-foreground">· {timeAgo(facts.created)}</span>
        </span>
      ),
    },
    !!facts.author && { label: 'Author', icon: CircleUser, value: facts.author },
    !!facts.platform && { label: 'Platform', icon: Cpu, value: facts.platform },
    !!facts.dockerVersion && { label: 'Docker version', icon: Box, value: facts.dockerVersion },
    !!facts.entrypoint && {
      label: 'Entrypoint',
      icon: LogIn,
      value: <Mono>{facts.entrypoint}</Mono>,
      copy: facts.entrypoint,
      wide: true,
    },
    !!facts.cmd && { label: 'Command', icon: Play, value: <Mono>{facts.cmd}</Mono>, copy: facts.cmd, wide: true },
    !!facts.workingDir && { label: 'Working directory', icon: Folder, value: <Mono>{facts.workingDir}</Mono> },
    !!facts.user && { label: 'User', icon: User, value: <Mono>{facts.user}</Mono> },
    facts.exposedPorts.length > 0 && {
      label: 'Exposed ports',
      icon: Network,
      value: <BadgeList values={facts.exposedPorts} />,
    },
    facts.volumes.length > 0 && { label: 'Volumes', icon: HardDrive, value: <BadgeList values={facts.volumes} /> },
    !!facts.stopSignal && { label: 'Stop signal', icon: OctagonX, value: <Mono>{facts.stopSignal}</Mono> },
    ...facts.customLabels.map(([label, value]) => ({ label, icon: Tag, value, copy: value })),
    ...facts.chart.map(([label, value]) => ({ label, icon: Box, value })),
  ];
  const items = list.filter((item): item is Fact => !!item);
  return (
    <Card>
      <CardContent className="py-1">
        <dl className="grid gap-x-10 gap-y-5 md:grid-cols-2">
          {items.map(({ label, icon: Icon, value, wide, copy }) => (
            <div key={label} className={cn('flex min-w-0 flex-col gap-1.5', wide && 'md:col-span-2')}>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5" />
                {label}
              </dt>
              <dd className="flex min-w-0 items-start gap-1.5 text-[13px]">
                <div className="min-w-0 pt-px">{value}</div>
                {copy && (
                  <span className="-my-1.5 shrink-0">
                    <CopyButton value={copy} label={`Copy ${label.toLowerCase()}`} />
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function BadgeList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="secondary" className="font-mono">
          {value}
        </Badge>
      ))}
    </div>
  );
}

function LayerItem({ layer, max }: { layer: LayerRow; max: number }) {
  const [open, setOpen] = useState(false);
  const share = layer.size && max ? Math.max(2, (layer.size / max) * 100) : 0;
  const text = layer.command || layer.digest;
  return (
    <li className="layer-row">
      <span className={cn('layer-number', layer.empty && 'empty')}>{layer.index + 1}</span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {layer.instruction && (
            <Badge variant={layer.empty ? 'outline' : 'secondary'} className="font-mono">
              {layer.instruction}
            </Badge>
          )}
          {layer.created && (
            <span className="text-xs text-muted-foreground">
              <TimeAgo value={layer.created} />
            </span>
          )}
        </div>
        {text && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            title={open ? undefined : text}
            className={cn('layer-command', !open && 'line-clamp-2')}
          >
            {text}
          </button>
        )}
      </div>
      <div className="layer-size">
        <span className={cn('text-[13px] tabular-nums', layer.empty && 'text-muted-foreground')}>
          {layer.empty ? '0 B' : bytesToSize(layer.size)}
        </span>
        <div className="layer-bar" aria-hidden="true">
          <div style={{ width: `${share}%` }} />
        </div>
      </div>
    </li>
  );
}

function LayersPanel({ rows, size }: { rows: LayerRow[]; size: number }) {
  const [view, setView] = useState<'list' | 'dockerfile'>('list');
  const max = useMemo(() => rows.reduce((value, row) => Math.max(value, row.size ?? 0), 0), [rows]);
  const count = rows.filter((row) => !row.empty).length;
  const hasHistory = rows.some((row) => row.instruction);
  if (!rows.length)
    return (
      <Card>
        <Empty className="min-h-40">
          <EmptyHeader>
            <EmptyTitle>No layers</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </Card>
    );
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="items-center border-b py-3">
        <CardTitle className="flex items-center gap-2 text-[13px]">
          {plural(count, 'layer')}
          <Badge variant="secondary" className="tabular-nums">
            {bytesToSize(size)}
          </Badge>
        </CardTitle>
        {hasHistory && (
          <CardAction className="flex items-center gap-1 self-center">
            {view === 'dockerfile' && <CopyButton value={toDockerfile(rows)} label="Copy Dockerfile" />}
            <ToggleGroup
              type="single"
              size="sm"
              spacing={0}
              variant="outline"
              value={view}
              onValueChange={(value) => value && setView(value as 'list' | 'dockerfile')}
              aria-label="Layers view"
            >
              <ToggleGroupItem value="list" aria-label="Layer list" title="Layer list">
                <List />
              </ToggleGroupItem>
              <ToggleGroupItem value="dockerfile" aria-label="Dockerfile" title="Dockerfile">
                <FileCode />
              </ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
        )}
      </CardHeader>
      {view === 'list' ? (
        <ol className="flex flex-col">
          {rows.map((row) => (
            <LayerItem key={row.index} layer={row} max={max} />
          ))}
        </ol>
      ) : (
        <CardContent className="py-4">
          <pre className="dockerfile">
            {rows
              .filter((row) => row.instruction)
              .map((row) => (
                <div key={row.index}>
                  <span className="font-semibold text-primary">{row.instruction}</span> {row.command}
                </div>
              ))}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}

function KeyValueCard({
  title,
  icon: Icon,
  entries,
}: {
  title: string;
  icon: LucideIcon;
  entries: [string, string][];
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex h-7 items-center gap-2 text-[13px]">
          <Icon className="size-4 text-muted-foreground" />
          {title}
          <Badge variant="secondary" className="tabular-nums">
            {entries.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      {entries.length ? (
        <ul className="flex flex-col">
          {entries.map(([key, value]) => (
            <li key={key} className="key-value group/kv">
              <div className="flex min-w-0 flex-1 flex-col gap-1 font-mono text-xs">
                <span className="font-medium break-all">{key}</span>
                <span className="break-all text-muted-foreground">{value || '""'}</span>
              </div>
              <span className="key-value-copy">
                <CopyButton value={`${key}=${value}`} label={`Copy ${key}`} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="min-h-24 p-6">
          <EmptyHeader>
            <EmptyTitle className="text-xs font-normal text-muted-foreground">None</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </Card>
  );
}

function PlatformsPanel({
  platforms,
  selected,
  onSelect,
}: {
  platforms: Descriptor[];
  selected?: string;
  onSelect: (platform: Descriptor) => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Table className="platforms-table">
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead className="hidden sm:table-cell">OS</TableHead>
            <TableHead className="hidden sm:table-cell">Architecture</TableHead>
            <TableHead className="hidden md:table-cell">Digest</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {platforms.map((platform) => {
            const active = platform.digest === selected;
            return (
              <TableRow
                key={platform.digest}
                data-state={active ? 'selected' : undefined}
                className="cursor-pointer"
                onClick={(event) => {
                  if (!(event.target as HTMLElement).closest('button')) onSelect(platform);
                }}
              >
                <TableCell>
                  <span className="flex items-center gap-2.5 font-mono text-xs font-medium">
                    <Cpu className="size-4 text-muted-foreground" />
                    {platformLabel(platform.platform)}
                  </span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {platform.platform?.os || '—'}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {[platform.platform?.architecture, platform.platform?.variant].filter(Boolean).join(' ') || '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="digest-cell">
                    <code title={platform.digest}>{platform.digest}</code>
                    <CopyButton value={platform.digest} label={`Copy digest for ${platformLabel(platform.platform)}`} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {active ? (
                    <Badge variant="secondary">
                      <Check data-icon="inline-start" />
                      Viewing
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => onSelect(platform)}>
                      View
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

export function TagPage({
  registry,
  repo,
  tag,
  view,
  settings,
  pullHost,
  onDelete,
}: {
  registry: Registry;
  repo: string;
  tag: string;
  view: TagView;
  settings: Settings;
  pullHost: string;
  onDelete: (tag: string) => void;
}) {
  const [tab, setTab] = useState<TabName>(TABS.includes(view.tab as TabName) ? (view.tab as TabName) : 'overview');
  const [platform, setPlatform] = useState(view.platform || '');
  const [info, setInfo] = useState<ImageInfo>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [pullBy, setPullBy] = useState<'tag' | 'digest'>('tag');

  useEffect(() => {
    let live = true;
    setBusy(true);
    setError('');
    (async () => {
      const root = await registry.image(repo, tag);
      const match = platform ? root.platforms.find((p) => platformLabel(p.platform) === platform) : undefined;
      return match && match.digest !== root.platformDigest ? registry.image(repo, tag, match.digest) : root;
    })()
      .then((result) => {
        if (live) setInfo(result);
      })
      .catch((e) => {
        if (live) setError(getMessage(e));
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [registry, repo, tag, platform]);

  function updateView(next: { tab?: TabName; platform?: string }) {
    const value = { tab: next.tab ?? tab, platform: next.platform ?? platform };
    const hash = detailsRoute(repo, tag, {
      tab: value.tab === 'overview' ? undefined : value.tab,
      platform: value.platform || undefined,
    });
    history.replaceState(null, '', location.pathname + location.search + hash);
  }
  function changeTab(value: string) {
    setTab(value as TabName);
    updateView({ tab: value as TabName });
  }
  function selectPlatform(value: Descriptor) {
    const label = platformLabel(value.platform);
    setPlatform(label);
    updateView({ platform: label });
  }

  const facts = useMemo(() => getImageFacts(info?.config, settings.customLabels), [info, settings.customLabels]);
  const rows = useMemo(() => (info ? buildLayerRows(info.history, info.layers) : []), [info]);
  const multiArch = (info?.platforms.length ?? 0) > 1;
  const activeTab = tab === 'platforms' && !multiArch ? 'overview' : tab;
  const split = repo.lastIndexOf('/');
  const command =
    pullBy === 'digest' && info?.digest
      ? `docker pull ${pullHost}/${repo}@${info.digest}`
      : `docker pull ${pullHost}/${repo}:${tag}`;

  return (
    <>
      <div className="tag-heading">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="tag-mark">
            <Layers3 />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="[overflow-wrap:anywhere] sm:truncate" title={`${repo}:${tag}`}>
              {split >= 0 && <span className="text-muted-foreground">{repo.slice(0, split + 1)}</span>}
              {repo.slice(split + 1)}
              <span className="text-muted-foreground">:</span>
              <span className="text-primary">{tag}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              {!info ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <>
                  <Badge variant="secondary">
                    <Cpu data-icon="inline-start" />
                    {multiArch ? plural(info.platforms.length, 'platform') : facts.platform || 'unknown'}
                  </Badge>
                  <Badge variant="outline">
                    <Box data-icon="inline-start" />
                    {manifestKind(info)}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {multiArch && info && (
            <Select
              value={info.platformDigest}
              onValueChange={(value) => {
                const next = info.platforms.find((p) => p.digest === value);
                if (next) selectPlatform(next);
              }}
            >
              <SelectTrigger aria-label="Platform" className="platform-trigger">
                <Cpu />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" position="popper">
                <SelectGroup>
                  {info.platforms.map((p) => (
                    <SelectItem key={p.digest} value={p.digest} className="font-mono text-xs">
                      {platformLabel(p.platform)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          {settings.deleteImages && (
            <Button variant="destructive" onClick={() => onDelete(tag)}>
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <PullCommand command={command}>
        <ToggleGroup
          type="single"
          size="sm"
          spacing={0}
          variant="outline"
          value={pullBy}
          onValueChange={(value) => value && setPullBy(value as 'tag' | 'digest')}
          aria-label="Pull by"
          className="pull-toggle"
        >
          <ToggleGroupItem value="tag">Tag</ToggleGroupItem>
          <ToggleGroupItem value="digest" disabled={!info?.digest}>
            Digest
          </ToggleGroupItem>
        </ToggleGroup>
      </PullCommand>

      {error ? (
        <ErrorNotice message={error} />
      ) : !info ? (
        <div className="flex flex-col gap-6" role="status" aria-label="Loading">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-[86px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : !info.config && !info.platforms.length ? (
        <Card>
          <Empty className="min-h-56">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageX />
              </EmptyMedia>
              <EmptyTitle>No image configuration</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <div className={cn('flex flex-col gap-6 transition-opacity', busy && 'opacity-60')} aria-busy={busy}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Created" icon={Calendar}>
              <TimeAgo value={facts.created} />
            </StatCard>
            <StatCard label="Size" icon={HardDrive}>
              {bytesToSize(info.size)}
            </StatCard>
            <StatCard label="Layers" icon={Layers3}>
              {info.layers.length.toLocaleString()}
            </StatCard>
            <StatCard label="Platform" icon={Cpu}>
              <span className="truncate">{facts.platform || '—'}</span>
            </StatCard>
          </div>

          <Tabs value={activeTab} onValueChange={changeTab} className="gap-4">
            <div className="max-w-full overflow-x-auto overflow-y-hidden">
              <TabsList className="tag-tabs">
                <TabsTrigger value="overview">
                  <ListTree />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="layers">
                  <Layers3 />
                  Layers
                  <Badge variant="secondary" className="tabular-nums">
                    {info.layers.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="config">
                  <FileJson />
                  Config
                </TabsTrigger>
                {multiArch && (
                  <TabsTrigger value="platforms">
                    <Cpu />
                    Platforms
                    <Badge variant="secondary" className="tabular-nums">
                      {info.platforms.length}
                    </Badge>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            <TabsContent value="overview">
              <OverviewPanel info={info} facts={facts} platformDigest={multiArch ? info.platformDigest : undefined} />
            </TabsContent>
            <TabsContent value="layers">
              <LayersPanel rows={rows} size={info.size} />
            </TabsContent>
            <TabsContent value="config" className="grid items-start gap-6 xl:grid-cols-2">
              <KeyValueCard title="Environment" icon={List} entries={facts.env} />
              <KeyValueCard title="Labels" icon={Tags} entries={facts.labels} />
              {info.manifest.annotations && Object.keys(info.manifest.annotations).length > 0 && (
                <KeyValueCard
                  title="Annotations"
                  icon={FileJson}
                  entries={Object.entries(info.manifest.annotations).sort(([a], [b]) => a.localeCompare(b))}
                />
              )}
            </TabsContent>
            {multiArch && (
              <TabsContent value="platforms">
                <PlatformsPanel platforms={info.platforms} selected={info.platformDigest} onSelect={selectPlatform} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </>
  );
}

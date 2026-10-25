import { useEffect, useRef, useState } from 'react';
import { Tag, Layers3, FileJson, Box, Calendar, HardDrive, Cpu, User, Hash } from 'lucide-react';
import { Registry } from '@/lib/registry';
import { dockerfileInstructions, platformLabel, type ImageInfo } from '@/lib/docker-image';
import type { Settings } from '@/lib/config';
import { bytesToSize, dateFormat } from '@/lib/utils-registry';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CopyButton, ErrorNotice, LoadingRows, NoResults, PullCommand } from './common';
function ConfigValue({ label, value }: { label: string; value: unknown }) {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    (typeof value === 'object' && !Object.keys(value).length)
  )
    return null;
  const formatted = Array.isArray(value)
    ? value.join('\n')
    : typeof value === 'object'
      ? Object.entries(value)
          .map(([k, v]) => `${k}${v && typeof v !== 'object' ? `=${v}` : ''}`)
          .join('\n')
      : String(value);
  return (
    <div className="config-field">
      <div className="config-label">
        {label}
        <CopyButton value={formatted} label={`Copy ${label.toLowerCase()}`} />
      </div>
      <pre>{formatted}</pre>
    </div>
  );
}
export function TagDetails({
  registry,
  repo,
  tag,
  settings,
  pull,
  onClose,
}: {
  registry: Registry;
  repo: string;
  tag: string;
  settings: Settings;
  pull: (tag: string) => string;
  onClose: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [info, setInfo] = useState<ImageInfo>();
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPlatform('');
  }, [repo, tag, registry]);
  useEffect(() => {
    if (!tag) return;
    let cancelled = false;
    setBusy(true);
    setError('');
    registry
      .image(repo, tag, platform || undefined)
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, tag, registry, platform]);
  const config = info?.config;
  const labels = config?.config?.Labels;
  return (
    <Sheet
      open={!!tag}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        className="tag-details"
        aria-describedby="tag-details-repository"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          headingRef.current?.focus();
        }}
      >
        <SheetHeader className="details-heading">
          <div className="eyebrow">
            <Tag />
            Tag details
          </div>
          <SheetTitle ref={headingRef} tabIndex={-1}>
            {tag}
          </SheetTitle>
          <SheetDescription id="tag-details-repository" title={repo}>
            {repo}
          </SheetDescription>
          <div className="details-actions">
            <Badge variant="outline">
              <Box />
              {info?.manifest.mediaType?.includes('index')
                ? 'OCI index'
                : info?.manifest.mediaType?.includes('list')
                  ? 'Manifest list'
                  : 'Image'}
            </Badge>
            <CopyButton value={location.href} label="Copy tag link" compact={false} />
          </div>
        </SheetHeader>
        <Separator />
        <div className="details-scroll">
          <PullCommand command={pull(tag)} />
          {error && <ErrorNotice message={error} />}
          {busy ? (
            <LoadingRows />
          ) : (
            info && (
              <>
                {info.platforms.length > 1 && (
                  <div className="platform-select">
                    <label htmlFor="platform-select">Platform</label>
                    <Select value={platform || info.platforms[0].digest} onValueChange={setPlatform}>
                      <SelectTrigger id="platform-select" aria-label="Platform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {info.platforms.map((m) => (
                            <SelectItem key={m.digest} value={m.digest}>
                              {platformLabel(m.platform)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Tabs defaultValue="overview">
                  <TabsList variant="line" className="details-tabs">
                    <TabsTrigger value="overview">
                      <Box />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="layers">
                      <Layers3 />
                      Layers <Badge variant="secondary">{info.layers.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="config">
                      <FileJson />
                      Config
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    <div className="overview-grid">
                      <div>
                        <Calendar />
                        <span>Created</span>
                        <strong title={info.created}>{dateFormat(info.created)}</strong>
                      </div>
                      <div>
                        <HardDrive />
                        <span>Compressed size</span>
                        <strong>{bytesToSize(info.size)}</strong>
                      </div>
                      <div>
                        <Cpu />
                        <span>Platform</span>
                        <strong>{config ? platformLabel(config) : '—'}</strong>
                      </div>
                      <div>
                        <Layers3 />
                        <span>Layers</span>
                        <strong>{info.layers.length}</strong>
                      </div>
                    </div>
                    {config?.author || labels?.maintainer ? (
                      <div className="detail-property">
                        <User />
                        <span>Author</span>
                        <strong>{config?.author || labels?.maintainer}</strong>
                      </div>
                    ) : null}
                    <div className="digest-block">
                      <div className="config-label">
                        <span className="inline-flex items-center gap-2">
                          <Hash className="size-3.5" />
                          Content digest
                        </span>
                        <CopyButton value={info.digest} label="Copy content digest" />
                      </div>
                      <code>{info.digest || 'Unavailable'}</code>
                    </div>
                    <ConfigValue label="Entrypoint" value={config?.config?.Entrypoint?.join(' ')} />
                    <ConfigValue label="Command" value={config?.config?.Cmd?.join(' ')} />
                    {settings.customLabels.map((label) => (
                      <ConfigValue key={label} label={label} value={labels?.[label]} />
                    ))}
                    <ConfigValue label="Labels" value={labels} />
                    <ConfigValue label="Annotations" value={info.manifest.annotations} />
                  </TabsContent>
                  <TabsContent value="layers">
                    <div className="layer-toolbar">
                      <span>{info.history.length || info.layers.length} instructions</span>
                      <CopyButton
                        compact={false}
                        label="Copy Dockerfile"
                        value={dockerfileInstructions(info.history)}
                      />
                    </div>
                    {info.history.length ? (
                      <ol className="layer-list">
                        {[...info.history].reverse().map((layer, i) => (
                          <li key={i}>
                            <span className="layer-index">{String(info.history.length - i).padStart(2, '0')}</span>
                            <div>
                              <div className="layer-metadata">
                                <Badge variant={layer.empty_layer ? 'outline' : 'secondary'}>
                                  {layer.empty_layer ? 'Metadata' : bytesToSize(layer.size)}
                                </Badge>
                                {layer.created && <time>{dateFormat(layer.created)}</time>}
                              </div>
                              <pre>{layer.created_by || layer.comment || layer.digest || 'Layer'}</pre>
                              {layer.digest && (
                                <code title={layer.digest} className="layer-digest truncate">
                                  {layer.digest}
                                </code>
                              )}
                              {layer.author && <span>{layer.author}</span>}
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : info.layers.length ? (
                      <ol className="layer-list">
                        {info.layers.map((layer, i) => (
                          <li key={layer.digest}>
                            <span className="layer-index">{i + 1}</span>
                            <div>
                              <Badge variant="secondary">{bytesToSize(layer.size)}</Badge>
                              <pre>{layer.digest}</pre>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <NoResults title="No layers" />
                    )}
                  </TabsContent>
                  <TabsContent value="config">
                    <ConfigValue label="Entrypoint" value={config?.config?.Entrypoint} />
                    <ConfigValue label="Command" value={config?.config?.Cmd} />
                    <ConfigValue label="Environment" value={config?.config?.Env} />
                    <ConfigValue label="Exposed ports" value={config?.config?.ExposedPorts} />
                    <ConfigValue label="Volumes" value={config?.config?.Volumes} />
                    <ConfigValue label="Working directory" value={config?.config?.WorkingDir} />
                    <ConfigValue label="User" value={config?.config?.User} />
                    <ConfigValue label="Docker version" value={config?.docker_version} />
                    <ConfigValue label="Labels" value={labels} />
                    <ConfigValue label="Image config" value={JSON.stringify(config || info.manifest, null, 2)} />
                  </TabsContent>
                </Tabs>
              </>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

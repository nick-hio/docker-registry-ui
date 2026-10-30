/* Copyright (C) 2016-2023 Jones Magloire @Joxit. Licensed under AGPL-3.0-or-later; see LICENSE. */
import { platformLabel, type Descriptor, type HistoryEntry, type ImageConfig, type ImageInfo } from './docker-image';

const INSTRUCTIONS =
  /^(FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\s+([\s\S]*)$/;

/** Split a history `created_by` value into a Dockerfile instruction and its arguments. */
export function parseCreatedBy(value = ''): { instruction: string; command: string } {
  const clean = value.trim().replace(/\s+# buildkit$/, '');
  const nop = /^\/bin\/sh\s+-c\s+#\(nop\)\s*([A-Z]+)\s+([\s\S]*)$/.exec(clean);
  if (nop) return { instruction: nop[1], command: nop[2].trim() };
  const instruction = INSTRUCTIONS.exec(clean);
  if (instruction) {
    const command = instruction[2].replace(/^\|\d+\s+(\S+=\S*\s+)*/, '').replace(/^\/bin\/sh\s+-c\s+/, '');
    return { instruction: instruction[1], command: command.trim() };
  }
  return { instruction: 'RUN', command: clean.replace(/^\/bin\/sh\s+-c\s+/, '').trim() };
}

export type LayerRow = {
  index: number;
  instruction: string;
  command: string;
  created?: string;
  /** Compressed size. Undefined for history entries that add no layer. */
  size?: number;
  digest?: string;
  empty: boolean;
};

/** One row per history entry, or one row per layer when the config has no history. */
export function buildLayerRows(history: HistoryEntry[], layers: Descriptor[] = []): LayerRow[] {
  if (!history.length)
    return layers.map((layer, index) => ({
      index,
      instruction: '',
      command: '',
      size: layer.size,
      digest: layer.digest,
      empty: false,
    }));
  return history.map((entry, index) => {
    const { instruction, command } = entry.created_by
      ? parseCreatedBy(entry.created_by)
      : { instruction: '', command: entry.comment || '' };
    const empty = !!entry.empty_layer || entry.digest === undefined;
    return { index, instruction, command, created: entry.created, size: entry.size, digest: entry.digest, empty };
  });
}

export const toDockerfile = (rows: LayerRow[]) =>
  rows
    .filter((row) => row.instruction)
    .map((row) => `${row.instruction} ${row.command}`)
    .join('\n');

/** Show an exec-form command (`["nginx", "-g", "daemon off;"]`) like a shell command. */
export function formatCommand(value?: string[] | string | null): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.map((arg) => (/[\s"'$;&|<>]/.test(arg) || arg === '' ? JSON.stringify(arg) : arg)).join(' ');
}

const splitEnv = (env: string): [string, string] => {
  const index = env.indexOf('=');
  return index < 0 ? [env, ''] : [env.slice(0, index), env.slice(index + 1)];
};

export type ImageFacts = {
  created?: string;
  author?: string;
  platform?: string;
  dockerVersion?: string;
  entrypoint?: string;
  cmd?: string;
  workingDir?: string;
  user?: string;
  stopSignal?: string;
  exposedPorts: string[];
  volumes: string[];
  env: [string, string][];
  labels: [string, string][];
  /** Labels named in `HISTORY_CUSTOM_LABELS`, moved out of `labels`. */
  customLabels: [string, string][];
  /** Helm chart fields. */
  chart: [string, string][];
};

const CHART_FIELDS: [keyof ImageConfig, string][] = [
  ['name', 'Chart name'],
  ['version', 'Chart version'],
  ['appVersion', 'App version'],
  ['kubeVersion', 'Kube version'],
  ['keywords', 'Keywords'],
  ['home', 'Home'],
  ['sources', 'Sources'],
];

export function getImageFacts(config: ImageConfig | undefined, customLabelNames: string[] = []): ImageFacts {
  const container = config?.config ?? {};
  const labels: Record<string, string> = { ...(container.Labels ?? {}) };
  let author = config?.author;
  if (!author && labels.maintainer) {
    author = labels.maintainer;
    delete labels.maintainer;
  }
  const customLabels: [string, string][] = [];
  for (const name of customLabelNames) {
    if (labels[name]) {
      customLabels.push([name, labels[name]]);
      delete labels[name];
    }
  }
  const chart: [string, string][] = [];
  for (const [key, label] of CHART_FIELDS) {
    const value = config?.[key];
    if (typeof value === 'string' && value) chart.push([label, value]);
    else if (Array.isArray(value) && value.length) chart.push([label, value.join(', ')]);
  }
  return {
    created: config?.created,
    author,
    platform: config?.architecture ? platformLabel(config) : undefined,
    dockerVersion: config?.docker_version,
    entrypoint: formatCommand(container.Entrypoint) || undefined,
    cmd: formatCommand(container.Cmd) || undefined,
    workingDir: container.WorkingDir || undefined,
    user: container.User || undefined,
    stopSignal: container.StopSignal || undefined,
    exposedPorts: Object.keys(container.ExposedPorts ?? {}),
    volumes: Object.keys(container.Volumes ?? {}),
    env: (container.Env ?? []).map(splitEnv),
    labels: Object.entries(labels)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b)),
    customLabels,
    chart,
  };
}

/** `OCI index`, `Manifest list`, or `Image`. */
export function manifestKind(info: Pick<ImageInfo, 'manifest'>) {
  const type = info.manifest.mediaType || '';
  return type.includes('index') ? 'OCI index' : type.includes('list') ? 'Manifest list' : 'Image';
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

/** "3 days ago", "last month"… Empty for a missing or invalid date. */
export function timeAgo(value?: string, now = Date.now()): string {
  const time = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(time)) return '';
  const diff = (time - now) / 1000;
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, seconds] of RELATIVE_UNITS)
    if (Math.abs(diff) >= seconds || unit === 'second') return format.format(Math.round(diff / seconds), unit);
  return '';
}

/** Date and time in the user's locale. Empty for a missing or invalid date. */
export function dateTimeFormat(value?: string): string {
  const date = value ? new Date(value) : undefined;
  if (!date || !Number.isFinite(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

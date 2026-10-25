/* Copyright (C) 2016-2023 Jones Magloire @Joxit. Licensed under AGPL-3.0-or-later; see LICENSE. */
export const DOCKER_LIST = 'application/vnd.docker.distribution.manifest.list.v2+json';
export const OCI_INDEX = 'application/vnd.oci.image.index.v1+json';
export const OCI_MANIFEST = 'application/vnd.oci.image.manifest.v1+json';
export type Platform = { os?: string; architecture?: string; variant?: string };
export type Descriptor = {
  mediaType?: string;
  digest: string;
  size: number;
  platform?: Platform;
  annotations?: Record<string, string>;
};
export type Manifest = {
  mediaType?: string;
  manifests?: Descriptor[];
  layers?: Descriptor[];
  config?: Descriptor;
  annotations?: Record<string, string>;
};
export type HistoryEntry = {
  created?: string;
  created_by?: string;
  author?: string;
  comment?: string;
  empty_layer?: boolean;
  size?: number;
  digest?: string;
};
export type ImageConfig = {
  created?: string;
  author?: string;
  architecture?: string;
  os?: string;
  variant?: string;
  docker_version?: string;
  config?: {
    Entrypoint?: string[];
    Cmd?: string[];
    Env?: string[];
    Labels?: Record<string, string>;
    ExposedPorts?: Record<string, unknown>;
    Volumes?: Record<string, unknown>;
    WorkingDir?: string;
    User?: string;
  };
  history?: HistoryEntry[];
};
export type ImageInfo = {
  tag: string;
  digest: string;
  manifest: Manifest;
  platforms: Descriptor[];
  size: number;
  created?: string;
  config?: ImageConfig;
  layers: Descriptor[];
  history: HistoryEntry[];
  error?: string;
};
export const supportListManifest = (response: Manifest) =>
  response.mediaType === DOCKER_LIST ||
  (response.mediaType === OCI_INDEX &&
    Array.isArray(response.manifests) &&
    response.manifests.every((m) => m.mediaType === OCI_MANIFEST));
export const filterWrongManifests = (response: Manifest) =>
  (response.manifests || []).filter((m) => m.annotations?.['vnd.docker.reference.type'] !== 'attestation-manifest');
export const platformToString = (platform?: Platform) =>
  platform?.architecture ? platform.architecture + (platform.variant || '') : 'unknown';
export const platformLabel = (platform?: Platform) => `${platform?.os || 'unknown'}/${platformToString(platform)}`;
export function layerHistory(config: ImageConfig, layers: Descriptor[]): HistoryEntry[] {
  let index = 0;
  return (config.history || []).map((entry) => {
    const layer = entry.empty_layer ? undefined : layers[index++];
    return { ...entry, size: layer?.size, digest: layer?.digest };
  });
}

export function dockerfileInstructions(history: HistoryEntry[]) {
  return history
    .map((entry) => {
      const raw = (entry.created_by || '').replace(/^\/bin\/sh\s+-c\s+(?:#\(nop\)\s*)?/, '').trim();
      if (!raw) return '';
      return /^(ADD|ARG|CMD|COPY|ENTRYPOINT|ENV|EXPOSE|FROM|HEALTHCHECK|LABEL|MAINTAINER|ONBUILD|RUN|SHELL|STOPSIGNAL|USER|VOLUME|WORKDIR)\b/.test(
        raw,
      )
        ? raw
        : `RUN ${raw}`;
    })
    .filter(Boolean)
    .join('\n');
}

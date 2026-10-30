import { useState } from 'react';
import {
  Boxes,
  Server,
  ChevronsUpDown,
  Check,
  Plus,
  Trash2,
  Folder,
  ChevronRight,
  Package,
  Layers3,
  UnfoldVertical,
  FoldVertical,
  Sun,
  Moon,
  ExternalLink,
} from 'lucide-react';
import type { Settings } from '@/lib/config';
import { getBranching, type RepositoryNode } from '@/lib/repositories';
import { stripHttps } from '@/lib/utils-registry';
import { repositoryRoute } from '@/lib/router';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { SearchInput } from './common';
import { cn } from '@/lib/utils';
function RepositoryTree({
  nodes,
  prefix = '',
  settings,
  counts,
  active,
  expanded,
  filter,
  visit,
}: {
  nodes: RepositoryNode[];
  prefix?: string;
  settings: Settings;
  counts: Record<string, number>;
  active: string;
  expanded: boolean | undefined;
  filter: string;
  visit: () => void;
}) {
  return (
    <SidebarMenu>
      {nodes.map((node) =>
        typeof node === 'string' ? (
          <SidebarMenuItem key={node}>
            <SidebarMenuButton asChild isActive={active === node} className="repository-leaf" title={node}>
              <a href={repositoryRoute(node)} onClick={visit}>
                <Package />
                <span>{node.startsWith(prefix) ? node.slice(prefix.length) : node}</span>
              </a>
            </SidebarMenuButton>
            {settings.showCounts && counts[node] !== undefined && <SidebarMenuBadge>{counts[node]}</SidebarMenuBadge>}
          </SidebarMenuItem>
        ) : (
          <SidebarMenuItem key={node.repo}>
            <Collapsible
              defaultOpen={
                expanded ?? (settings.defaultExpanded || nodes.length === 1 || !!filter || active.startsWith(node.repo))
              }
              className="namespace-group"
            >
              <CollapsibleTrigger asChild>
                <SidebarMenuButton title={node.repo}>
                  <ChevronRight className="tree-chevron" />
                  <Folder />
                  <span>{node.repo.slice(prefix.length).replace(/\/$/, '')}</span>
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="tree-children">
                  <RepositoryTree
                    nodes={node.images}
                    prefix={node.repo}
                    settings={settings}
                    counts={counts}
                    active={active}
                    expanded={expanded}
                    filter={filter}
                    visit={visit}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        ),
      )}
    </SidebarMenu>
  );
}

export function ExplorerSidebar({
  settings,
  title,
  url,
  registries,
  repositories,
  counts,
  active,
  filter,
  setFilter,
  onRegistry,
  onAdd,
  onRemove,
  dark,
  onTheme,
  connected,
  failed,
}: {
  settings: Settings;
  title: string;
  url: string;
  registries: string[];
  repositories: string[];
  counts: Record<string, number>;
  active: string;
  filter: string;
  setFilter: (value: string) => void;
  onRegistry: (url: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  dark: boolean;
  onTheme: () => void;
  connected: boolean;
  failed: boolean;
}) {
  const { setOpenMobile } = useSidebar();
  const [expanded, setExpanded] = useState<boolean | undefined>();
  const [treeVersion, setTreeVersion] = useState(0);
  let tree: RepositoryNode[] = [];
  let branchingError = '';
  try {
    tree = getBranching(settings.minBranches, settings.maxBranches)(repositories);
  } catch (error) {
    branchingError = (error as Error).message;
    tree = repositories;
  }
  const visit = () => setOpenMobile(false);
  const registryIdentity = (
    <>
      <span className="registry-icon">
        <Server />
      </span>
      <span className="registry-title truncate">{title}</span>
      {!settings.singleRegistry && <ChevronsUpDown />}
    </>
  );
  return (
    <Sidebar>
      <SidebarHeader className="explorer-sidebar-header">
        <a href="#/" className="brand" onClick={visit}>
          <span className="brand-mark">
            <Boxes />
          </span>
          <span>{settings.title}</span>
        </a>
        {settings.singleRegistry ? (
          <div className="registry-identity">{registryIdentity}</div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="registry-switcher">
                {registryIdentity}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="registry-menu">
              <DropdownMenuGroup>
                {[...new Set(['', ...registries, url])].map((value) => (
                  <DropdownMenuItem key={value} onSelect={() => onRegistry(value)}>
                    <Server />
                    <span className="truncate">
                      {value ? stripHttps(value) : settings.registryTitle || 'Same origin'}
                    </span>
                    {url === value && <Check className="ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              {!settings.readOnlyRegistries && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={onAdd}>
                      <Plus />
                      Add registry
                    </DropdownMenuItem>
                    {!!url && registries.includes(url) && (
                      <DropdownMenuItem onSelect={onRemove}>
                        <Trash2 />
                        Remove registry
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <SearchInput value={filter} onChange={setFilter} label="Filter repositories" id="repository-filter" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={!active}>
                <a href="#/" onClick={visit}>
                  <Layers3 />
                  <span>All repositories</span>
                </a>
              </SidebarMenuButton>
              <SidebarMenuBadge>{repositories.length}</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <div className="tree-label">
            <SidebarGroupLabel>Namespaces</SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={expanded ? 'Collapse namespaces' : 'Expand namespaces'}
              title={expanded ? 'Collapse namespaces' : 'Expand namespaces'}
              onClick={() => {
                setExpanded(!expanded);
                setTreeVersion((v) => v + 1);
              }}
            >
              {expanded ? <FoldVertical /> : <UnfoldVertical />}
            </Button>
          </div>
          {branchingError && (
            <p role="alert" className="branching-error">
              {branchingError}
            </p>
          )}
          <div key={`${treeVersion}:${filter}:${active}:${tree.length}`}>
            <RepositoryTree
              nodes={tree}
              settings={settings}
              counts={counts}
              active={active}
              expanded={expanded}
              filter={filter}
              visit={visit}
            />
          </div>
          {!repositories.length && <p className="sidebar-empty">No repositories</p>}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="explorer-sidebar-footer">
        <SidebarSeparator />
        <div className="sidebar-connection">
          <span className={cn('status-dot', failed && 'offline', !connected && !failed && 'pending')} />
          <span>{connected ? 'Connected' : failed ? 'Unavailable' : 'Connecting'}</span>
          <span className="api-version">API v2</span>
        </div>
        <div className="sidebar-bottom">
          <Button variant="ghost" size="sm" asChild>
            <a href="https://github.com/nick-hio/docker-registry-ui" target="_blank" rel="noreferrer">
              <ExternalLink data-icon="inline-start" />
              Source
            </a>
          </Button>
          {settings.theme === 'auto' && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={dark ? 'Use light theme' : 'Use dark theme'}
              title={dark ? 'Use light theme' : 'Use dark theme'}
              onClick={onTheme}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

import { useState } from 'react';
import { Check, Copy, Search, X, TriangleAlert, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyContent } from '@/components/ui/empty';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
export function CopyButton({
  value,
  label = 'Copy',
  compact = true,
}: {
  value: string;
  label?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const area = document.createElement('textarea');
        area.value = value;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        if (!ok) throw new Error('Copy unavailable');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy unavailable. Select and copy the command.');
    }
  }
  return (
    <Button variant="ghost" size={compact ? 'icon-sm' : 'sm'} title={label} aria-label={label} onClick={copy}>
      {copied ? <Check /> : <Copy />}
      {!compact && label}
    </Button>
  );
}
export function SearchInput({
  value,
  onChange,
  label,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  id?: string;
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton aria-label={`Clear ${label.toLowerCase()}`} size="icon-xs" onClick={() => onChange('')}>
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>Registry error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
export function NoResults({ title, onReset }: { title: string; onReset?: () => void }) {
  return (
    <Empty className="min-h-48">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PackageOpen />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
      {onReset && (
        <EmptyContent>
          <Button variant="outline" onClick={onReset}>
            Clear filter
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
export function LoadingRows() {
  return (
    <div className="flex flex-col gap-5 p-6" role="status" aria-label="Loading">
      {[0, 1, 2].map((n) => (
        <Skeleton key={n} className="h-7 w-full" />
      ))}
    </div>
  );
}
export function PullCommand({ command, children }: { command: string; children?: React.ReactNode }) {
  return (
    <div className="pull-command">
      <span className="command-prompt" aria-hidden="true">
        $
      </span>
      <code title={command}>{command}</code>
      {children}
      <CopyButton value={command} label="Copy pull command" />
    </div>
  );
}

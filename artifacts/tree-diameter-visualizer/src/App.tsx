import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCalculateTreeDiameter, useGenerateTree, type DiameterAnalysis, type Tree } from '@workspace/api-client-react';
import { Activity, ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, GitBranch, Home as HomeIcon, LocateFixed, Menu, Network, RefreshCw, ScanSearch, X } from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TreeCanvas } from '@/components/tree-canvas';
import { buildManualTree, getManualTreeProgress } from '@/lib/manual-tree';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const storageKey = 'tree-diameter-state';

type WorkspaceState = {
  tree: Tree | null;
  result: DiameterAnalysis | null;
  origin: 'random' | 'manual';
  setTree: (tree: Tree | null) => void;
  setResult: (result: DiameterAnalysis | null) => void;
  setOrigin: (origin: 'random' | 'manual') => void;
};

function readStoredWorkspace() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    const tree = stored?.tree;
    const result = stored?.result;
    return {
      tree: tree?.nodeCount && Array.isArray(tree.nodes) && Array.isArray(tree.edges) ? tree as Tree : null,
      result: result?.diameterPath && Array.isArray(result.diameterPath) ? result as DiameterAnalysis : null,
      origin: stored?.origin === 'manual' ? ('manual' as const) : ('random' as const),
    };
  } catch {
    return { tree: null, result: null, origin: 'random' as const };
  }
}

function useWorkspaceState(): WorkspaceState {
  const [initialState] = useState(readStoredWorkspace);
  const [tree, setTree] = useState<Tree | null>(initialState.tree);
  const [result, setResult] = useState<DiameterAnalysis | null>(initialState.result);
  const [origin, setOrigin] = useState<'random' | 'manual'>(initialState.origin);
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ tree, result, origin }));
  }, [tree, result, origin]);
  return { tree, result, origin, setTree, setResult, setOrigin };
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const visualizerActive = location === '/visualize' || location === '/result';
  const navItems = [
    { href: '/', label: 'Home', active: location === '/', testId: 'link-home' },
    { href: '/generate', label: 'Generate', active: location === '/generate', testId: 'link-generate' },
    { href: '/visualize', label: 'Visualizer', active: visualizerActive, testId: 'link-visualizer' },
  ];
  useEffect(() => setMenuOpen(false), [location]);
  return (
    <div className="noise min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-[hsl(var(--background)/.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Link href="/" data-testid="link-brand" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition group-hover:-rotate-6"><GitBranch size={18} strokeWidth={2.6} /></span>
            <span className="leading-none"><span className="block text-[13px] font-bold tracking-tight">Tree Diameter</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[.18em] text-muted-foreground">Visualization system</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {navItems.map((item) => <Link key={item.href} href={item.href} data-testid={item.testId} className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${item.active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/generate" data-testid="button-header-get-started" className="hidden items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--accent-foreground))] transition hover:-translate-y-0.5 sm:inline-flex">Get Started <ArrowRight size={15} /></Link>
            <button type="button" data-testid="button-mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen((open) => !open)} className="rounded-lg border border-border p-2.5 text-muted-foreground md:hidden">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
          </div>
        </div>
        {menuOpen && <nav className="border-t border-border/80 bg-[hsl(var(--background))] px-5 py-3 md:hidden" aria-label="Mobile navigation">
          {navItems.map((item) => <Link key={item.href} href={item.href} data-testid={`${item.testId}-mobile`} className={`block rounded-lg px-3 py-3 text-sm font-semibold ${item.active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{item.label}</Link>)}
          <Link href="/generate" data-testid="button-mobile-get-started" className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-4 py-3 text-sm font-bold text-[hsl(var(--accent-foreground))]">Get Started <ArrowRight size={15} /></Link>
        </nav>}
      </header>
      {children}
      <footer className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-7 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground sm:px-8"><span>Tree workspace / 01</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />API connected</span></footer>
    </div>
  );
}

function Home() {
  return <main className="app-grid relative min-h-[calc(100dvh-72px)] overflow-hidden">
    <div className="pointer-events-none absolute -right-28 top-16 h-80 w-80 rounded-full bg-[hsl(var(--accent)/.13)] blur-3xl" />
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-14 sm:px-8 sm:pt-24">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-24">
        <section className="fade-up">
          <div data-testid="text-system-name" className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-[hsl(var(--card)/.8)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /> TREE DIAMETER VISUALIZATION SYSTEM</div>
          <h1 data-testid="text-home-title" className="max-w-4xl text-[clamp(3.2rem,8vw,7.5rem)] font-bold leading-[.9] tracking-[-.075em] text-primary">Make the<br /><span className="text-[hsl(var(--accent))]">structure visible.</span></h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-muted-foreground">Generate, visualize, and analyze tree structures through an interactive web application.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/generate" data-testid="button-get-started" className="group inline-flex items-center gap-3 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5">Get Started <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>
            <Link href="/visualize" data-testid="button-open-visualizer" className="inline-flex items-center gap-2 rounded-xl border border-border bg-[hsl(var(--card)/.76)] px-5 py-3.5 text-sm font-bold transition hover:border-primary">Open workspace <LocateFixed size={15} /></Link>
          </div>
        </section>
        <section className="fade-up delay-2 relative">
          <div className="rounded-[1.75rem] border border-border bg-[hsl(var(--card)/.78)] p-4 shadow-[0_24px_70px_hsl(var(--primary)/.1)] backdrop-blur-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-border/80 pb-4"><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.15em] text-muted-foreground"><Activity size={13} className="text-[hsl(var(--accent))]" /> Live canvas</div><span className="rounded-full bg-muted px-2 py-1 font-mono text-[9px] text-muted-foreground">READY</span></div>
            <MiniTree />
            <div className="mt-5 grid grid-cols-3 gap-2"><HomeStat label="Nodes" value="48" /><HomeStat label="Edges" value="47" /><HomeStat label="Path" value="12" accent /></div>
          </div>
        </section>
      </div>
      <div className="mt-24 grid gap-5 border-t border-border/80 pt-8 sm:grid-cols-3">
        <Feature icon={<Network size={18} />} number="01" title="Generate a valid tree" copy="Choose a scale from 2 to 1,000 nodes and let the API prepare the workspace." />
        <Feature icon={<ScanSearch size={18} />} number="02" title="Read the shape" copy="Move through a responsive hierarchy with deliberate spacing and an adaptive canvas." />
        <Feature icon={<Activity size={18} />} number="03" title="Review the path" copy="Run the analysis and isolate the exact route that spans the structure." />
      </div>
    </div>
  </main>;
}

function MiniTree() {
  const links = [[140, 44, 100, 91], [140, 44, 181, 91], [100, 91, 67, 139], [100, 91, 124, 139], [181, 91, 158, 139], [181, 91, 215, 139], [67, 139, 48, 181], [67, 139, 82, 181], [215, 139, 238, 181]];
  const nodes = [[140, 44], [100, 91], [181, 91], [67, 139], [124, 139], [158, 139], [215, 139], [48, 181], [82, 181], [238, 181]];
  return <svg viewBox="0 0 280 210" className="h-auto w-full" aria-label="Example tree"><path d="M20 195H260" stroke="hsl(var(--border))" strokeDasharray="2 5" />{links.map(([x1, y1, x2, y2], index) => <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={index < 3 || index === 6 ? 'hsl(var(--accent))' : 'hsl(var(--chart-2) / .5)'} strokeWidth={index < 3 || index === 6 ? 3 : 1.7} strokeLinecap="round" />)}{nodes.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index === 0 || index === 2 || index === 6 || index === 7 ? 7 : 5} fill={index === 0 || index === 2 || index === 6 || index === 7 ? 'hsl(var(--accent))' : 'hsl(var(--chart-2))'} stroke="hsl(var(--primary))" strokeWidth="2" />)}</svg>;
}

function HomeStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className="rounded-xl bg-muted/65 p-3"><div className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">{label}</div><div className={`mt-1 font-mono text-xl ${accent ? 'text-[hsl(var(--accent))]' : 'text-primary'}`}>{value}</div></div>; }
function Feature({ icon, number, title, copy }: { icon: ReactNode; number: string; title: string; copy: string }) { return <div className="flex gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">{icon}</div><div><div className="font-mono text-[10px] text-muted-foreground">{number}</div><h3 className="mt-1 font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p></div></div>; }

function Generate({ state }: { state: WorkspaceState }) {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<'random' | 'manual'>(state.origin);
  const [count, setCount] = useState('100');
  const [edgesText, setEdgesText] = useState('');
  const [error, setError] = useState('');
  const generate = useGenerateTree();
  const nodeCount = Number(count);
  const requiredEdges = Number.isInteger(nodeCount) ? Math.max(0, nodeCount - 1) : 0;
  const progress = getManualTreeProgress(edgesText);
  const selectMode = (nextMode: 'random' | 'manual') => {
    setMode(nextMode);
    setError('');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nodes = Number(count);
    if (!/^\d+$/.test(count) || !Number.isInteger(nodes) || nodes < 2 || nodes > 1000) { setError('Enter a whole number from 2 to 1,000.'); return; }
    setError('');
    generate.mutate({ data: { nodes } }, {
      onSuccess: (tree) => { state.setTree(tree); state.setResult(null); state.setOrigin('random'); navigate('/visualize'); },
      onError: () => setError('We could not generate that tree right now. Please try again.'),
    });
  };
  const build = (event: FormEvent) => {
    event.preventDefault();
    const result = buildManualTree(count, edgesText);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    state.setTree(result.tree);
    state.setResult(null);
    state.setOrigin('manual');
    navigate('/visualize');
  };
  return <main className="app-grid min-h-[calc(100dvh-72px)]"><div className="mx-auto max-w-[1080px] px-5 py-10 sm:px-8 sm:py-16"><Link href="/" data-testid="link-back-home" className="mb-12 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><ArrowLeft size={15} /> Back home</Link><div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-24"><section className="fade-up"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--chart-2))]">01 / Configure</div><h1 className="mt-4 text-5xl font-bold leading-[.92] tracking-[-.065em] text-primary sm:text-7xl">Create your<br /><span className="text-[hsl(var(--accent))]">tree.</span></h1><p className="mt-6 max-w-md leading-7 text-muted-foreground">Set the node count. The service will return one connected structure, ready to inspect on the canvas.</p></section><form onSubmit={mode === 'random' ? submit : build} className="fade-up delay-1 rounded-[1.5rem] border border-border bg-[hsl(var(--card)/.84)] p-6 shadow-xl shadow-[hsl(var(--primary)/.06)] sm:p-8"><div className="mb-7 grid grid-cols-2 rounded-xl border border-border bg-muted/55 p-1"><button type="button" data-testid="button-mode-random" aria-pressed={mode === 'random'} onClick={() => selectMode('random')} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${mode === 'random' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Random Tree</button><button type="button" data-testid="button-mode-manual" aria-pressed={mode === 'manual'} onClick={() => selectMode('manual')} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${mode === 'manual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Manual Tree</button></div><label htmlFor="node-count" className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Number of nodes</label><div className="mt-4 flex items-center rounded-2xl border border-border bg-background px-5 py-4 transition focus-within:border-[hsl(var(--accent))]"><input id="node-count" data-testid="input-node-count" type="number" min={2} max={1000} value={count} onChange={(event) => { setCount(event.target.value); setError(''); }} className="w-full bg-transparent font-mono text-5xl font-medium text-primary outline-none" /><span className="font-mono text-xs text-muted-foreground">nodes</span></div><div className="mt-3 flex justify-between font-mono text-[10px] text-muted-foreground"><span>Minimum 2</span><span>Maximum 1,000</span></div>{mode === 'manual' && <><div className="mt-7 rounded-xl border border-border bg-muted/45 px-4 py-3"><div className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Tree capacity</div><div className="mt-1 font-mono text-sm font-semibold text-primary">{Number.isInteger(nodeCount) && nodeCount >= 2 ? nodeCount.toLocaleString() : '—'} nodes <span className="px-1 text-muted-foreground">•</span> {requiredEdges.toLocaleString()} edges required</div></div><div className="mt-7"><label htmlFor="tree-edges" className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Enter edges</label><p className="mt-1 text-xs text-muted-foreground">One pair per line</p><textarea id="tree-edges" data-testid="input-tree-edges" rows={8} value={edgesText} onChange={(event) => { setEdgesText(event.target.value); setError(''); }} className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.12)]" /></div><div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground"><span>Unique Nodes: {progress.uniqueNodeCount} / {Number.isInteger(nodeCount) && nodeCount >= 2 ? nodeCount.toLocaleString() : '—'}</span><span>Edges: {progress.edgeCount} / {requiredEdges.toLocaleString()}</span></div></>}{error && <div data-testid="status-generate-error" role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] px-3 py-3 text-sm text-[hsl(var(--destructive))]"><CircleAlert size={16} className="mt-0.5 shrink-0" />{error}</div>}<button type="submit" data-testid={mode === 'random' ? 'button-generate-tree' : 'button-build-tree'} disabled={mode === 'random' && generate.isPending} className={`${mode === 'manual' ? 'mt-7' : 'mt-9'} flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65`}>{mode === 'random' ? generate.isPending ? <>Generating your tree...</> : <>Generate Tree <ArrowRight size={17} /></> : <>Build Tree <ArrowRight size={17} /></>}</button>{mode === 'random' && <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Connected · valid · N − 1 edges</p>}</form></div></div></main>;
}

function EmptyState({ action }: { action: () => void }) { return <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><GitBranch size={27} /></div><h1 className="mt-6 text-3xl font-bold tracking-tight">No tree in the workspace</h1><p className="mt-3 leading-7 text-muted-foreground">Generate a tree first, then return here to inspect its structure.</p><button type="button" data-testid="button-empty-generate" onClick={action} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground">Generate a tree <ArrowRight size={16} /></button></div>; }
function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className="rounded-xl border border-border bg-[hsl(var(--card)/.72)] px-4 py-4"><div className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">{label}</div><div className={`mt-2 text-xl font-bold tracking-tight ${accent ? 'text-[hsl(var(--accent))]' : 'text-primary'}`}>{value}</div></div>; }
function Metrics({ tree, result }: { tree: Tree; result?: DiameterAnalysis | null }) { return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Total nodes" value={tree.nodeCount.toLocaleString()} /><Metric label="Total edges" value={tree.edges.length.toLocaleString()} /><Metric label={result ? 'Diameter' : 'Tree status'} value={result ? `${result.diameterLength} edges` : 'Valid tree'} accent={Boolean(result)} /><Metric label={result ? 'Start → End' : 'Structure'} value={result ? `${result.startNode} → ${result.endNode}` : 'Connected'} /></div>; }

function Visualize({ state }: { state: WorkspaceState }) {
  const [, navigate] = useLocation();
  const [error, setError] = useState('');
  const calculate = useCalculateTreeDiameter();
  const generate = useGenerateTree();
  if (!state.tree) return <EmptyState action={() => navigate('/generate')} />;
  const tree = state.tree;
  const regenerate = () => {
    setError('');
    generate.mutate({ data: { nodes: tree.nodeCount } }, {
      onSuccess: (nextTree) => { state.setTree(nextTree); state.setResult(null); state.setOrigin('random'); },
      onError: () => setError('We could not create a replacement tree. Please try again.'),
    });
  };
  const diameter = () => {
    setError('');
    calculate.mutate({ data: tree }, {
      onSuccess: (analysis) => { state.setResult(analysis); navigate('/result'); },
      onError: () => setError('We could not calculate the diameter right now. Please try again.'),
    });
  };
  return <main className="app-grid min-h-[calc(100dvh-72px)]"><div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-12"><div className="fade-up flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--chart-2))]">02 / Inspect</div><h1 className="mt-3 text-4xl font-bold tracking-[-.06em] text-primary sm:text-6xl">Generated <span className="text-[hsl(var(--accent))]">tree.</span></h1><p data-testid="text-tree-summary" className="mt-3 text-sm text-muted-foreground">A connected structure with {tree.nodeCount.toLocaleString()} nodes, arranged for reading.</p></div><div className="flex flex-wrap gap-2"><button type="button" data-testid="button-back-generate" onClick={() => navigate('/generate')} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold transition hover:border-primary"><ArrowLeft size={15} /> Back</button><button type="button" data-testid="button-regenerate-tree" onClick={regenerate} disabled={generate.isPending || calculate.isPending} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold transition hover:border-primary disabled:opacity-60">{generate.isPending ? 'Generating...' : <><RefreshCw size={15} /> Regenerate</>}</button><button type="button" data-testid="button-calculate-diameter" onClick={diameter} disabled={calculate.isPending || generate.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65">{calculate.isPending ? 'Calculating diameter...' : <>Calculate Diameter <ArrowRight size={15} /></>}</button></div></div>{error && <div data-testid="status-visualize-error" className="mt-5 flex items-center gap-2 rounded-xl border border-[hsl(var(--destructive)/.22)] bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]"><CircleAlert size={16} />{error}</div>}<div className="mt-8 fade-up delay-1"><Metrics tree={tree} /><div className="mt-5"><TreeCanvas tree={tree} showAllLabels={state.origin === 'manual'} /></div></div></div></main>;
}

function Legend() {
  return <div className="mt-7 border-t border-border pt-5"><div className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Legend</div><div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--muted-foreground)/.4)]" /> Normal node</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" /> Diameter node</span><span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-[hsl(var(--muted-foreground)/.35)]" /> Normal edge</span><span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-[hsl(var(--accent))]" /> Diameter edge</span></div></div>;
}

function Result({ state }: { state: WorkspaceState }) {
  const [, navigate] = useLocation();
  if (!state.tree || !state.result) return <EmptyState action={() => navigate('/generate')} />;
  const { tree, result } = state;
  return <main className="app-grid min-h-[calc(100dvh-72px)]"><div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-12"><div className="fade-up flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--accent))]">03 / Result</div><h1 className="mt-3 text-4xl font-bold tracking-[-.06em] text-primary sm:text-6xl">Diameter <span className="text-[hsl(var(--accent))]">analysis.</span></h1><p className="mt-3 text-sm text-muted-foreground">The same generated tree, with its longest route isolated.</p></div><div className="flex flex-wrap gap-2"><button type="button" data-testid="button-back-tree" onClick={() => navigate('/visualize')} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold transition hover:border-primary"><ArrowLeft size={15} /> Back to Visualization</button><button type="button" data-testid="button-new-tree" onClick={() => navigate('/generate')} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><RefreshCw size={15} /> Generate New Tree</button><button type="button" data-testid="button-home" onClick={() => navigate('/')} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold transition hover:border-primary"><HomeIcon size={15} /> Home</button></div></div><div className="mt-8 fade-up delay-1"><div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><Metric label="Total nodes" value={tree.nodeCount.toLocaleString()} /><Metric label="Total edges" value={tree.edges.length.toLocaleString()} /><Metric label="Diameter" value={`${result.diameterLength} edges`} accent /><Metric label="Start node" value={String(result.startNode)} /><Metric label="End node" value={String(result.endNode)} /></div><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]"><TreeCanvas tree={tree} result={result} showAllLabels={state.origin === 'manual'} /><aside className="rounded-[1.25rem] border border-border bg-[hsl(var(--card)/.8)] p-5"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> Diameter path</div><div data-testid="text-diameter-path" className="mt-5 flex max-w-full items-center gap-2 overflow-x-auto pb-2">{result.diameterPath.map((node, index) => <span key={`${node}-${index}`} className="flex shrink-0 items-center gap-2"><span data-testid={`text-path-node-${node}`} className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-mono text-xs font-medium ${node === result.startNode || node === result.endNode ? 'bg-primary text-primary-foreground' : 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'}`}>{node}</span>{index < result.diameterPath.length - 1 && <ChevronRight size={13} className="text-muted-foreground" />}</span>)}</div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5"><div><div className="font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">Start node</div><div data-testid="text-start-node" className="mt-1 font-mono text-2xl">{result.startNode}</div></div><div><div className="font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">End node</div><div data-testid="text-end-node" className="mt-1 font-mono text-2xl">{result.endNode}</div></div></div><div className="mt-6 flex items-center gap-2 rounded-xl bg-[hsl(var(--chart-2)/.1)] px-3 py-3 text-xs font-semibold text-[hsl(var(--chart-2))]"><Check size={15} /> Path highlighted in the graph</div><Legend /></aside></div></div></div></main>;
}

function Router() {
  const state = useWorkspaceState();
  return <ErrorBoundary resetKey={window.location.pathname}><Shell><Switch><Route path="/" component={Home} /><Route path="/generate"><Generate state={state} /></Route><Route path="/visualize"><Visualize state={state} /></Route><Route path="/result"><Result state={state} /></Route><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
import { Routes, Route, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, BarChart3, FileText, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, MapPin, Mic, Wifi, WifiOff,
  ChevronRight, Bell, Settings, Search, Plus, X, Star,
  ArrowUp, ArrowDown, Minus, RefreshCw, Shield, Zap, Activity
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ─── API client ──────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: '/v1', timeout: 10_000 });

// ─── Types ───────────────────────────────────────────────────────────────────
type Tier    = 'Critical' | 'High' | 'Medium' | 'Low';
type Status  = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'escalated';

// ─── Constants ───────────────────────────────────────────────────────────────
const TIER_CONFIG: Record<Tier, { bg: string; text: string; border: string; dot: string }> = {
  Critical: { bg:'bg-red-500/10',    text:'text-red-300',    border:'border-l-red-500',    dot:'bg-red-500' },
  High:     { bg:'bg-orange-500/10', text:'text-orange-300', border:'border-l-orange-500', dot:'bg-orange-500' },
  Medium:   { bg:'bg-yellow-500/10', text:'text-yellow-300', border:'border-l-yellow-500', dot:'bg-yellow-500' },
  Low:      { bg:'bg-blue-500/10',   text:'text-blue-300',   border:'border-l-blue-500',   dot:'bg-blue-500' },
};

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-yellow-500/15 text-yellow-300',
  assigned:    'bg-blue-500/15 text-blue-300',
  in_progress: 'bg-indigo-500/15 text-indigo-300',
  resolved:    'bg-green-500/15 text-green-300',
  escalated:   'bg-red-500/15 text-red-300',
  proposed:    'bg-yellow-500/15 text-yellow-300',
  accepted:    'bg-blue-500/15 text-blue-300',
  completed:   'bg-green-500/15 text-green-300',
  declined:    'bg-red-500/15 text-red-300',
  expired:     'bg-gray-500/15 text-gray-400',
};

const CAT_COLORS: Record<string, string> = {
  water:'#38bdf8', health:'#f87171', education:'#a78bfa',
  infrastructure:'#fb923c', food:'#facc15', sanitation:'#34d399', safety:'#f472b6', other:'#6b7280',
};

const CAT_EMOJI: Record<string, string> = {
  water:'💧', health:'🏥', education:'📚', infrastructure:'🔨', food:'🌾', sanitation:'🚰', safety:'🛡️', other:'📌',
};

// ─── Shared UI ───────────────────────────────────────────────────────────────
function Skeleton({ className = 'h-8' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

function TierBadge({ tier }: { tier: Tier }) {
  const c = TIER_CONFIG[tier] ?? TIER_CONFIG.Low;
  return (
    <span className={`badge border ${c.bg} ${c.text} border-current/30`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {tier}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] ?? 'bg-gray-700 text-gray-300'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBar({ value, max = 100, color = '#3b82f6' }: { value: number; max?: number; color?: string }) {
  return (
    <div className="w-full bg-[#232b3e] rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// SVG Gauge
function Gauge({ value, max = 100 }: { value: number; max?: number }) {
  const pct   = Math.min(value / max, 1);
  const R     = 52, circ = Math.PI * R, dash = pct * circ;
  const color = value > 80 ? '#ef4444' : value > 60 ? '#f97316' : value > 40 ? '#eab308' : '#3b82f6';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M 8 66 A 52 52 0 0 1 112 66" fill="none" stroke="#1c2333" strokeWidth="10" strokeLinecap="round" />
        <path d="M 8 66 A 52 52 0 0 1 112 66" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }} />
        <text x="60" y="62" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">{Math.round(value)}</text>
      </svg>
      <span className="text-xs text-gray-400">Priority Score</span>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Command Center' },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytics'      },
  { to: '/volunteers',    icon: Users,           label: 'Volunteers'     },
  { to: '/performance',   icon: TrendingUp,      label: 'Performance'    },
];

function Sidebar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen bg-[#0f1117] border-r border-[#1c2333]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1c2333]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">SmartAlloc</p>
            <p className="text-[10px] text-gray-500 mt-0.5">NGO Platform</p>
          </div>
        </div>
      </div>

      {/* NGO info */}
      <div className="px-4 py-3 border-b border-[#1c2333]">
        <div className="bg-[#1c2333] rounded-lg px-3 py-2.5">
          <p className="text-xs font-semibold text-white truncate">Pratham Sewa Foundation</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Pune, Maharashtra</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="relative w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
              <span className="relative block w-2 h-2 rounded-full bg-green-500" />
            </div>
            <span className="text-[10px] text-green-400">Live</span>
            <span className="text-gray-600 text-[10px] ml-auto">{time.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
               ${isActive ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`
            }>
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#1c2333] space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">A</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">NGO Admin</p>
            <p className="text-[10px] text-gray-500 truncate">admin@prathamsewa.org</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── SCREEN 1: Command Center ────────────────────────────────────────────────
function CommandCenter() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [filterTier, setFilterTier] = useState<string>('');

  const { data: issuesData, isLoading: issLoading, refetch } = useQuery({
    queryKey: ['issues'],
    queryFn:  () => api.get('/issues').then(r => r.data),
    refetchInterval: 15_000,
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ['assignments'],
    queryFn:  () => api.get('/assignments').then(r => r.data),
    refetchInterval: 10_000,
  });

  const issues      = issuesData?.issues ?? [];
  const assignments = assignmentsData?.assignments ?? [];
  const active      = assignments.filter((a: any) => ['proposed','accepted','in_progress'].includes(a.status));

  const filtered = issues
    .filter((i: any) => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.location_label?.toLowerCase().includes(search.toLowerCase()))
    .filter((i: any) => !filterTier || i.priority_tier === filterTier)
    .filter((i: any) => i.status !== 'resolved');

  const selected = issues.find((i: any) => i.issue_id === selectedId);

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* Left: Issue Feed */}
      <div className="w-[320px] shrink-0 flex flex-col border-r border-[#1c2333] bg-[#0f1117] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1c2333]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity size={14} className="text-blue-400" /> Live Issues
            </h2>
            <button onClick={() => refetch()} className="p-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-white transition-colors" title="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search issues…"
              className="input w-full pl-8 py-1.5 text-xs" />
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {['','Critical','High','Medium'].map(t => (
              <button key={t} onClick={() => setFilterTier(t)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${filterTier === t ? 'bg-blue-600 border-blue-500 text-white' : 'border-[#2a3347] text-gray-400 hover:border-gray-500'}`}>
                {t || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {issLoading && Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-20 w-full" />)}
          {filtered.map((issue: any) => {
            const tc = TIER_CONFIG[issue.priority_tier as Tier] ?? TIER_CONFIG.Low;
            return (
              <button key={issue.issue_id} onClick={() => setSelectedId(issue.issue_id === selectedId ? null : issue.issue_id)}
                className={`w-full text-left p-3 rounded-lg border-l-4 transition-all ${tc.border}
                  ${selectedId === issue.issue_id ? `${tc.bg} ring-1 ring-white/10` : 'bg-[#161b27] hover:bg-[#1c2333]'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-white leading-snug line-clamp-2 flex-1">{issue.title}</p>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${tc.bg} ${tc.text}`}>{Math.round(issue.priority_score)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400">{CAT_EMOJI[issue.category]} {issue.category}</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-xs text-gray-400">👥 {issue.affected_count}</span>
                  <span className="ml-auto"><StatusBadge status={issue.status} /></span>
                </div>
                {issue.location_label && (
                  <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 truncate">
                    <MapPin size={10} /> {issue.location_label}
                  </p>
                )}
              </button>
            );
          })}
          {!issLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <CheckCircle2 size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No active issues</p>
            </div>
          )}
        </div>
      </div>

      {/* Center: Map + Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative map-placeholder overflow-hidden">
          {/* Simulated map with issue pins */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">
              {/* Grid lines */}
              <svg className="absolute inset-0 w-full h-full opacity-10">
                <defs>
                  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#3b82f6" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Location label */}
              <div className="absolute top-4 left-4 bg-[#0f1117]/80 backdrop-blur rounded-lg px-3 py-2 border border-[#232b3e] flex items-center gap-2">
                <MapPin size={13} className="text-blue-400" />
                <span className="text-xs text-gray-300">Pune, Maharashtra — Live View</span>
                <span title="Simulated — no API key needed"><WifiOff size={11} className="text-yellow-400 ml-1" /></span>
              </div>

              {/* Issue pins */}
              <IssueMapPins issues={filtered} selectedId={selectedId} onSelect={setSelectedId} />

              {/* Volunteer dots legend */}
              <div className="absolute bottom-4 left-4 bg-[#0f1117]/80 backdrop-blur rounded-lg px-3 py-2 border border-[#232b3e]">
                <p className="text-[10px] text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Volunteer Status</p>
                <div className="space-y-1">
                  {[['bg-green-500','Available'],['bg-orange-500','Busy'],['bg-gray-500','Offline']].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${c}`}/><span className="text-[11px] text-gray-300">{l}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected issue detail strip */}
        {selected && (
          <div className="border-t border-[#1c2333] bg-[#161b27] p-4 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <TierBadge tier={selected.priority_tier as Tier} />
                  <StatusBadge status={selected.status} />
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{selected.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selected.description?.slice(0,120)}…</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <NavLink to={`/issues/${selected.issue_id}`} className="btn-primary text-xs py-1.5">View Detail</NavLink>
                <button onClick={() => setSelectedId(null)} className="btn-ghost p-1.5"><X size={14}/></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Active Assignments */}
      <div className="w-[300px] shrink-0 flex flex-col border-l border-[#1c2333] bg-[#0f1117] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1c2333]">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Bell size={14} className="text-orange-400" /> Active Assignments
            <span className="ml-auto bg-orange-500/20 text-orange-300 text-xs px-1.5 py-0.5 rounded-full">{active.length}</span>
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {active.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <CheckCircle2 size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No active assignments</p>
            </div>
          )}
          {active.map((a: any) => (
            <div key={a.assignment_id} className="card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white truncate flex-1">{a.volunteer_name}</p>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">{a.issue_title}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1"><Star size={10} className="text-yellow-400"/>{Math.round(a.match_score * 100)}% match</span>
                <span className="flex items-center gap-1"><Clock size={10}/>{a.estimated_arrival_minutes}min ETA</span>
              </div>
              <PriorityBar value={a.match_score * 100} color="#3b82f6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Simulated map pins (positioned within the map div)
function IssueMapPins({ issues, selectedId, onSelect }: { issues: any[]; selectedId: string|null; onSelect: (id: string) => void }) {
  const positions = [
    { top:'35%', left:'48%' }, { top:'25%', left:'62%' }, { top:'55%', left:'35%' },
    { top:'42%', left:'68%' }, { top:'60%', left:'55%' }, { top:'30%', left:'30%' },
    { top:'48%', left:'45%' },
  ];
  return (
    <>
      {issues.slice(0,7).map((issue: any, i: number) => {
        const pos  = positions[i] ?? { top:'50%', left:'50%' };
        const tc   = TIER_CONFIG[issue.priority_tier as Tier] ?? TIER_CONFIG.Low;
        const isSel = issue.issue_id === selectedId;
        return (
          <button key={issue.issue_id} onClick={() => onSelect(issue.issue_id)}
            style={{ top: pos.top, left: pos.left }}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-200
              ${isSel ? 'z-20 scale-125' : 'z-10 hover:scale-110'}`}
            title={issue.title}
          >
            <div className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm
              ${isSel ? `${tc.dot.replace('bg-','bg-')} border-white shadow-lg` : `bg-[#0f1117] ${tc.border.replace('border-l-','border-')}`}`}>
              {CAT_EMOJI[issue.category] || '📌'}
              {issue.priority_tier === 'Critical' && (
                <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${tc.dot.replace('bg-','bg-')} animate-ping opacity-75`} />
              )}
            </div>
            {isSel && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#161b27] border border-[#232b3e] rounded-lg p-2 w-44 z-30 shadow-xl animate-fade-in">
                <p className="text-xs font-medium text-white line-clamp-2">{issue.title}</p>
                <p className="text-[10px] text-gray-400 mt-1">Score: {Math.round(issue.priority_score)} · {issue.affected_count} affected</p>
              </div>
            )}
          </button>
        );
      })}
      {/* Volunteer dots */}
      {[
        { top:'40%', left:'52%', status:'available' },
        { top:'28%', left:'58%', status:'busy' },
        { top:'50%', left:'40%', status:'available' },
        { top:'65%', left:'60%', status:'offline' },
        { top:'38%', left:'72%', status:'available' },
      ].map((v, i) => (
        <div key={i} style={{ top: v.top, left: v.left }}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-5">
          <div className={`w-3 h-3 rounded-full border border-white/30 shadow
            ${v.status === 'available' ? 'bg-green-500' : v.status === 'busy' ? 'bg-orange-500' : 'bg-gray-500'}`} />
        </div>
      ))}
    </>
  );
}

// ─── SCREEN 2: Analytics ─────────────────────────────────────────────────────
function Analytics() {
  const { data: summary } = useQuery({ queryKey:['summary'], queryFn:() => api.get('/dashboard/summary').then(r=>r.data) });
  const { data: trends  } = useQuery({ queryKey:['trends'],  queryFn:() => api.get('/analytics/trends').then(r=>r.data) });
  const { data: resol   } = useQuery({ queryKey:['resolution'], queryFn:() => api.get('/analytics/resolution').then(r=>r.data) });

  const catData = Object.entries(summary?.issues?.by_category ?? {}).map(([name, value]) => ({ name, value }));
  const COLORS  = Object.values(CAT_COLORS);

  const metricCards = [
    { label:'Total Issues (7d)',  value: summary?.issues?.total ?? '–',               icon: FileText,  color:'text-blue-400',   bg:'bg-blue-500/10' },
    { label:'Critical Issues',    value: summary?.issues?.escalated ?? '–',            icon: AlertTriangle, color:'text-red-400', bg:'bg-red-500/10' },
    { label:'Volunteers Active',  value: summary?.volunteers?.currently_available ?? '–', icon: Users, color:'text-green-400', bg:'bg-green-500/10' },
    { label:'Avg Response (min)', value: summary?.assignments?.avg_response_time_min ?? '–', icon: Clock, color:'text-yellow-400', bg:'bg-yellow-500/10' },
  ];

  const trendList = trends?.trends ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time NGO performance overview</p>
        </div>
        <select className="input text-xs py-1.5">
          <option>Last 7 days</option><option>Last 30 days</option><option>All time</option>
        </select>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {metricCards.map(card => (
          <div key={card.label} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</p>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={16} className={card.color} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trend lines */}
        <div className="col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Issue Trends (30 days)</h3>
          {trends ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trends.chartData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2333" />
                <XAxis dataKey="date" tick={{ fill:'#6b7280', fontSize:10 }} />
                <YAxis tick={{ fill:'#6b7280', fontSize:10 }} />
                <Tooltip contentStyle={{ backgroundColor:'#161b27', border:'1px solid #232b3e', borderRadius:8, fontSize:12 }} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                {['water','health','infrastructure','food'].map(cat => (
                  <Line key={cat} type="monotone" dataKey={cat} stroke={CAT_COLORS[cat]} strokeWidth={2} dot={false} activeDot={{ r:3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : <Skeleton className="h-52" />}
        </div>

        {/* Donut */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">By Category</h3>
          {catData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor:'#161b27', border:'1px solid #232b3e', borderRadius:8, fontSize:11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Skeleton className="h-44" />}
          <div className="mt-2 space-y-1">
            {catData.slice(0,4).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-400 capitalize flex-1">{d.name}</span>
                <span className="text-white font-medium">{String(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend signals + Resolution chart */}
      <div className="grid grid-cols-2 gap-4">
        {/* Trend signals */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Category Trends</h3>
          <div className="space-y-3">
            {trendList.slice(0,6).map((t: any) => (
              <div key={t.category} className="flex items-center gap-3">
                <span className="text-base w-5 shrink-0">{CAT_EMOJI[t.category]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300 capitalize">{t.category}</span>
                    <span className={`text-xs font-medium flex items-center gap-0.5
                      ${t.trend_direction === 'Rising' ? 'text-red-400' : t.trend_direction === 'Falling' ? 'text-green-400' : 'text-gray-400'}`}>
                      {t.trend_direction === 'Rising' ? <ArrowUp size={10}/> : t.trend_direction === 'Falling' ? <ArrowDown size={10}/> : <Minus size={10}/>}
                      {Math.abs(t.percent_change)}%
                    </span>
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {t.sparkline_data?.slice(7).map((v: number, i: number) => (
                      <div key={i} className="flex-1 bg-[#232b3e] rounded-sm overflow-hidden" style={{ height:16 }}>
                        <div className={`w-full ${t.trend_direction === 'Rising' ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ height: `${Math.max((v / 6 * 100), 5)}%`, marginTop: 'auto' }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">{t.this_week_count}</p>
                  <p className="text-[10px] text-gray-500">this week</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution stacked bar */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Resolved vs Open (8 weeks)</h3>
          {resol ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={resol.weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2333" />
                <XAxis dataKey="week" tick={{ fill:'#6b7280', fontSize:10 }} />
                <YAxis tick={{ fill:'#6b7280', fontSize:10 }} />
                <Tooltip contentStyle={{ backgroundColor:'#161b27', border:'1px solid #232b3e', borderRadius:8, fontSize:12 }} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="resolved" stackId="a" fill="#22c55e" name="Resolved" radius={[0,0,0,0]} />
                <Bar dataKey="open"     stackId="a" fill="#f87171" name="Open"     radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Skeleton className="h-48" />}
        </div>
      </div>

      {/* AI Insight Summary */}
      {trends?.summary && (
        <div className="card p-5 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Zap size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-300 mb-2">AI Weekly Insight</p>
              <p className="text-sm text-gray-300 leading-relaxed">{trends.summary.sentence_1}</p>
              <p className="text-sm text-gray-300 leading-relaxed mt-1">{trends.summary.sentence_2}</p>
              <p className="text-sm text-blue-300 leading-relaxed mt-1 font-medium">→ {trends.summary.sentence_3}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCREEN 3: Volunteers ────────────────────────────────────────────────────
function Volunteers() {
  const [search, setSearch]     = useState('');
  const [skillFilter, setSkill] = useState('');
  const [drawer, setDrawer]     = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['volunteers', skillFilter],
    queryFn:  () => api.get('/volunteers', { params: skillFilter ? { skill: skillFilter } : {} }).then(r => r.data),
    refetchInterval: 30_000,
  });

  const vols = (data?.volunteers ?? []).filter((v: any) =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.location_label?.toLowerCase().includes(search.toLowerCase())
  );

  const SKILLS = ['first_aid','water_testing','medical','construction','education','counseling','logistics','tech','translation','driving'];

  return (
    <div className="flex-1 overflow-hidden flex animate-fade-in">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">Volunteer Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{data?.total ?? 0} volunteers registered</p>
          </div>
          <button className="btn-primary flex items-center gap-2"><Plus size={14}/>Add Volunteer</button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or location…" className="input w-full pl-9" />
          </div>
          <select value={skillFilter} onChange={e => setSkill(e.target.value)} className="input">
            <option value="">All skills</option>
            {SKILLS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm" role="grid" aria-label="Volunteer roster">
            <thead className="bg-[#1c2333] text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                {['Name','Skills','Location','Tasks','Response Rate','Status',''].map(col => (
                  <th key={col} scope="col" className="px-4 py-3 text-left font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2333]">
              {isLoading && Array.from({length:5}).map((_,i) => (
                <tr key={i}>{Array.from({length:7}).map((_,j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}</tr>
              ))}
              {vols.map((v: any) => (
                <tr key={v.volunteer_id} onClick={() => setDrawer(v)}
                  onKeyDown={(e) => e.key === 'Enter' && setDrawer(v)}
                  tabIndex={0} role="row"
                  className="bg-[#161b27] hover:bg-[#1c2333] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ring-inset outline-none">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {v.name.charAt(0)}
                      </div>
                      <span className="font-medium text-white">{v.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {v.skills.slice(0,3).map((s: string) => (
                        <span key={s} className="text-[10px] bg-[#232b3e] text-gray-300 px-1.5 py-0.5 rounded">{s.replace('_',' ')}</span>
                      ))}
                      {v.skills.length > 3 && <span className="text-[10px] text-gray-500">+{v.skills.length-3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{v.location_label ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${v.active_assignments >= 2 ? 'text-orange-400' : 'text-gray-300'}`}>
                      {v.active_assignments}<span className="text-gray-600 font-normal">/3</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-[#232b3e] rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width:`${v.response_rate*100}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{Math.round(v.response_rate*100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full
                      ${v.availability_status === 'available' ? 'bg-green-500/15 text-green-300' : v.availability_status === 'busy' ? 'bg-orange-500/15 text-orange-300' : 'bg-gray-500/15 text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${v.availability_status === 'available' ? 'bg-green-500' : v.availability_status === 'busy' ? 'bg-orange-500' : 'bg-gray-500'}`} />
                      {v.availability_status}
                    </span>
                  </td>
                  <td className="px-4 py-3"><ChevronRight size={14} className="text-gray-600" /></td>
                </tr>
              ))}
              {!isLoading && vols.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">No volunteers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="w-80 shrink-0 border-l border-[#1c2333] bg-[#0f1117] overflow-y-auto animate-fade-in">
          <div className="p-4 border-b border-[#1c2333] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Profile</h3>
            <button onClick={() => setDrawer(null)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"><X size={14}/></button>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                {drawer.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-white">{drawer.name}</p>
                <p className="text-xs text-gray-400">{drawer.phone}</p>
                {!drawer.verified && <span className="text-[10px] bg-yellow-500/15 text-yellow-300 px-1.5 py-0.5 rounded mt-1 inline-block">Pending verification</span>}
              </div>
            </div>

            {[
              { label:'Location', value: drawer.location_label },
              { label:'Languages', value: drawer.languages?.join(', ') },
              { label:'Weekly Capacity', value: `${drawer.hours_per_week}h/week` },
              { label:'Distance Willing', value: `${drawer.distance_willing_km}km radius` },
              { label:'Completed Tasks', value: drawer.completed_assignments },
              { label:'Fatigue Score', value: drawer.volunteer_fatigue_score?.toFixed(2) },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-400">{row.label}</span>
                <span className="text-white font-medium">{row.value}</span>
              </div>
            ))}

            <div>
              <p className="text-xs text-gray-400 mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {drawer.skills.map((s: string) => (
                  <span key={s} className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full">{s.replace('_',' ')}</span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-2">Reliability Score</p>
              <div className="flex items-center gap-3">
                <PriorityBar value={drawer.reliability_score * 100} color="#22c55e" />
                <span className="text-sm font-bold text-green-400 shrink-0">{Math.round(drawer.reliability_score*100)}%</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-2">Response Rate</p>
              <div className="flex items-center gap-3">
                <PriorityBar value={drawer.response_rate * 100} color="#3b82f6" />
                <span className="text-sm font-bold text-blue-400 shrink-0">{Math.round(drawer.response_rate*100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCREEN 4: Issue Detail ───────────────────────────────────────────────────
function IssueDetail() {
  const { issueId } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['issue', issueId],
    queryFn:  () => api.get(`/issues/${issueId}`).then(r => r.data),
    enabled: !!issueId,
  });

  const { data: matchData, isLoading: matching } = useQuery({
    queryKey: ['match', issueId],
    queryFn:  () => api.get(`/match/${issueId}`).then(r => r.data),
    enabled: !!issueId,
  });

  const assign = useMutation({
    mutationFn: (volunteerId: string) => api.post('/assignments', { issue_id: issueId, volunteer_id: volunteerId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue', issueId] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['issues'] });
    },
  });

  const issue = data?.issue;

  if (isLoading) return (
    <div className="p-6 space-y-4 animate-fade-in">
      {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );
  if (!issue) return (
    <div className="p-6 text-gray-400 flex items-center gap-2">
      <AlertTriangle size={16}/> Issue not found.
      <button onClick={() => navigate('/')} className="btn-ghost ml-2 text-xs">← Back</button>
    </div>
  );

  const tc = TIER_CONFIG[issue.priority_tier as Tier] ?? TIER_CONFIG.Low;
  const pc = issue.priority_components ?? { severity:3, frequency:2, urgency:1.5, recency_decay:0.87 };

  return (
    <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2 mt-0.5 shrink-0"><ChevronRight size={16} className="rotate-180" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <TierBadge tier={issue.priority_tier as Tier} />
            <StatusBadge status={issue.status} />
            <span className="text-xs text-gray-500">{CAT_EMOJI[issue.category]} {issue.category}</span>
          </div>
          <h1 className="text-xl font-bold text-white">{issue.title}</h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1"><MapPin size={12}/>{issue.location_label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-white">{Math.round(issue.priority_score)}</p>
          <p className="text-xs text-gray-400">priority score</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left col: Issue info + Priority */}
        <div className="col-span-2 space-y-5">
          {/* Description card */}
          <div className={`card p-5 border-l-4 ${tc.border}`}>
            <p className="text-sm text-gray-300 leading-relaxed">{issue.description}</p>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#232b3e]">
              <div className="text-center"><p className="text-2xl font-bold text-white">{issue.affected_count}</p><p className="text-xs text-gray-400">Affected</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-white capitalize">{issue.category}</p><p className="text-xs text-gray-400">Category</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-white capitalize">{issue.status.replace('_',' ')}</p><p className="text-xs text-gray-400">Status</p></div>
              <div className="text-center"><p className="text-lg font-bold text-white">{new Date(issue.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p><p className="text-xs text-gray-400">Reported</p></div>
            </div>
          </div>

          {/* Priority breakdown */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Shield size={14} className="text-blue-400"/>Priority Score Breakdown</h3>
            <div className="flex items-start gap-6">
              <Gauge value={issue.priority_score} />
              <div className="flex-1 space-y-3">
                {[
                  { label:'Severity',       value: pc.severity/5,       color:'#f87171', raw:`${pc.severity}/5` },
                  { label:'Frequency',      value: Math.min(pc.frequency/5,1), color:'#fb923c', raw:`${pc.frequency?.toFixed(1)}x` },
                  { label:'Urgency',        value: Math.min(pc.urgency/2,1),   color:'#facc15', raw:`${pc.urgency?.toFixed(1)}×` },
                  { label:'Recency Decay',  value: pc.recency_decay,    color:'#38bdf8', raw:`${Math.round(pc.recency_decay*100)}%` },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-24 shrink-0">{b.label}</span>
                    <div className="flex-1"><PriorityBar value={b.value*100} color={b.color} /></div>
                    <span className="text-xs text-gray-300 font-mono w-10 text-right shrink-0">{b.raw}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right col: Matched volunteers */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Users size={14} className="text-blue-400"/>Matched Volunteers
            </h3>
            {matchData && (
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${matchData.policy === 'auto_assign' ? 'bg-green-500/15 text-green-300' : matchData.policy === 'suggest_admin' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-red-500/15 text-red-300'}`}>
                  {matchData.policy?.replace('_',' ')}
                </span>
              </div>
            )}
            {matching && Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-20 mb-2 w-full" />)}
            <div className="space-y-3">
              {matchData?.matches?.map((m: any) => (
                <div key={m.volunteer_id} className="p-3 rounded-lg bg-[#1c2333] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#232b3e] flex items-center justify-center text-[10px] font-bold text-gray-300">#{m.rank}</span>
                      <span className="text-sm font-medium text-white">{m.name}</span>
                    </div>
                    <span className="text-xs font-bold text-blue-300">{Math.round(m.composite_score*100)}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {m.match_reasons?.map((r: string) => (
                      <span key={r} className="text-[10px] bg-[#232b3e] text-gray-400 px-1.5 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">{m.distance_km}km · {m.estimated_arrival_minutes}min ETA</span>
                    <button onClick={() => assign.mutate(m.volunteer_id)} disabled={assign.isPending || issue.status === 'assigned'}
                      className="btn-primary text-xs py-1 px-2.5 disabled:opacity-40">
                      {assign.isPending ? '…' : 'Assign'}
                    </button>
                  </div>
                  <PriorityBar value={m.composite_score*100} color="#3b82f6" />
                </div>
              ))}
              {matchData?.matches?.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No eligible volunteers found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 5: Performance ────────────────────────────────────────────────────
function Performance() {
  const { data: summary } = useQuery({ queryKey:['summary'], queryFn:() => api.get('/dashboard/summary').then(r=>r.data) });
  const { data: resol   } = useQuery({ queryKey:['resolution'], queryFn:() => api.get('/analytics/resolution').then(r=>r.data) });

  const topVols = summary?.volunteers?.top_5_by_assignments ?? [];

  const utilizationData = [
    { name:'Mon', utilization:72 }, { name:'Tue', utilization:85 }, { name:'Wed', utilization:68 },
    { name:'Thu', utilization:91 }, { name:'Fri', utilization:78 }, { name:'Sat', utilization:55 }, { name:'Sun', utilization:40 },
  ];

  const responseData = [
    { week:'W1',avg:12 },{ week:'W2',avg:9 },{ week:'W3',avg:11 },
    { week:'W4',avg:7 },{ week:'W5',avg:8 },{ week:'W6',avg:6 },
    { week:'W7',avg:7 },{ week:'W8',avg:8.2 },
  ];

  const kpiCards = [
    { label:'Issues Resolved',    value:`${summary?.issues?.resolved ?? 0}`,      sub:'this period', color:'text-green-400', icon:CheckCircle2 },
    { label:'Accept Rate',        value:`${summary?.assignments?.acceptance_rate_pct ?? 0}%`, sub:'of assignments', color:'text-blue-400', icon:Activity },
    { label:'Avg Response Time',  value:`${summary?.assignments?.avg_response_time_min ?? 0}m`, sub:'target <1min', color:'text-yellow-400', icon:Clock },
    { label:'Active Volunteers',  value:`${summary?.volunteers?.currently_available ?? 0}`, sub:'of '+( summary?.volunteers?.verified ?? 0)+' verified', color:'text-purple-400', icon:Users },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">Performance Report</h1>
        <p className="text-sm text-gray-400 mt-0.5">NGO operational metrics and volunteer analytics</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{card.label}</p>
              <card.icon size={15} className={card.color} />
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Resolution chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Resolved vs Open by Week</h3>
          {resol ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resol.weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2333" />
                <XAxis dataKey="week" tick={{ fill:'#6b7280', fontSize:10 }} />
                <YAxis tick={{ fill:'#6b7280', fontSize:10 }} />
                <Tooltip contentStyle={{ backgroundColor:'#161b27', border:'1px solid #232b3e', borderRadius:8, fontSize:12 }} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="resolved" stackId="a" fill="#22c55e" name="Resolved" />
                <Bar dataKey="open"     stackId="a" fill="#f87171" name="Open" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Skeleton className="h-52" />}
        </div>

        {/* Response time */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Avg Assignment Response Time (min)</h3>
          <p className="text-xs text-gray-400 mb-4">Target: &lt;1 minute · Current avg: 8.2 min</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={responseData}>
              <defs>
                <linearGradient id="respGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2333" />
              <XAxis dataKey="week" tick={{ fill:'#6b7280', fontSize:10 }} />
              <YAxis tick={{ fill:'#6b7280', fontSize:10 }} />
              <Tooltip contentStyle={{ backgroundColor:'#161b27', border:'1px solid #232b3e', borderRadius:8, fontSize:12 }} />
              <Area type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} fill="url(#respGradient)" name="Avg min" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Utilization */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Volunteer Utilization Rate (this week)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2333" />
              <XAxis dataKey="name" tick={{ fill:'#6b7280', fontSize:10 }} />
              <YAxis tick={{ fill:'#6b7280', fontSize:10 }} unit="%" />
              <Tooltip contentStyle={{ backgroundColor:'#161b27', border:'1px solid #232b3e', borderRadius:8, fontSize:12 }} formatter={(v:any) => `${v}%`} />
              <Bar dataKey="utilization" fill="#8b5cf6" radius={[4,4,0,0]} name="Utilization" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top volunteers */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Star size={14} className="text-yellow-400"/>Top Volunteers</h3>
          <div className="space-y-3">
            {topVols.map((v: any, i: number) => (
              <div key={v.volunteer_id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-[#232b3e] text-gray-300'}`}>
                  {i+1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{v.name}</p>
                  <PriorityBar value={(v.completed / (topVols[0]?.completed || 1)) * 100} color={i === 0 ? '#eab308' : '#3b82f6'} />
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white">{v.completed}</p>
                  <p className="text-[10px] text-gray-500">tasks</p>
                </div>
              </div>
            ))}
            {topVols.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-14 shrink-0 border-b border-[#1c2333] flex items-center px-5 gap-4">
          <div className="flex-1 flex items-center gap-2 text-xs text-gray-500">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            All systems operational
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors relative">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Routes */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/"               element={<CommandCenter />} />
            <Route path="/analytics"      element={<Analytics />} />
            <Route path="/volunteers"     element={<Volunteers />} />
            <Route path="/performance"    element={<Performance />} />
            <Route path="/issues/:issueId" element={<IssueDetail />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

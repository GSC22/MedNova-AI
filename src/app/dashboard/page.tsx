"use client";

// ============================================================
// MedNova-AI — Main Dashboard Page
// Next.js 14 App Router · Full cyberpunk-clinical dark UI
// ============================================================

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Brain,
  ShieldAlert,
  FileText,
  Activity,
  Heart,
  Zap,
  ChevronRight,
  Clock,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Shield,
  Wifi,
  Monitor,
  Hexagon,
  ArrowUpRight,
  BarChart2,
  Lock,
  Bell,
  Settings,
  User,
  LogOut,
  Moon,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { TriageLevel, AssessmentRecord } from "@/types/medical";

// ── Lazy-load heavy components ────────────────────────────────

const AssessmentWizard = dynamic(
  () => import("@/components/dashboard/AssessmentWizard"),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
          <span className="text-xs text-slate-500 tracking-widest uppercase">
            Loading Clinical Engine...
          </span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

const EmergencyPanel = dynamic(
  () => import("@/components/dashboard/EmergencyPanel"),
  { ssr: false }
);

// ── Tab Configuration ─────────────────────────────────────────

type TabId = "assessment" | "emergency" | "records";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
  badge?: string;
}

const TABS: TabConfig[] = [
  {
    id: "assessment",
    label: "AI Assessment",
    icon: <Brain className="w-4 h-4" />,
    description: "Symptom analysis & clinical guidance",
  },
  {
    id: "emergency",
    label: "Emergency Hub",
    icon: <ShieldAlert className="w-4 h-4" />,
    description: "Emergency contacts & nearby facilities",
  },
  {
    id: "records",
    label: "Records",
    icon: <FileText className="w-4 h-4" />,
    description: "Assessment history",
  },
];

// ── Mock Records Data ─────────────────────────────────────────

const MOCK_RECORDS: AssessmentRecord[] = [
  {
    id: "rec-001",
    date: new Date(Date.now() - 3 * 86400000),
    chiefComplaint: "Persistent headache and fatigue",
    triageOutcome: "ADVISORY",
    summary:
      "Conservative guidance provided: rest, hydration, sleep hygiene. Consultation recommended if symptoms persist beyond 5 days.",
    wasEmergency: false,
    followUpRequired: true,
  },
  {
    id: "rec-002",
    date: new Date(Date.now() - 10 * 86400000),
    chiefComplaint: "Mild sore throat and nasal congestion",
    triageOutcome: "ADVISORY",
    summary:
      "Upper respiratory symptoms consistent with minor illness. Rest and adequate hydration advised. No emergency indicators.",
    wasEmergency: false,
    followUpRequired: false,
  },
  {
    id: "rec-003",
    date: new Date(Date.now() - 21 * 86400000),
    chiefComplaint: "Lower back pain after prolonged sitting",
    triageOutcome: "INCONCLUSIVE",
    summary:
      "Insufficient data to provide comprehensive guidance. Referral to healthcare professional for assessment recommended.",
    wasEmergency: false,
    followUpRequired: true,
  },
];

// ── Utility ───────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Animated Background Grid ──────────────────────────────────

function BackgroundGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.8) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Radial fade */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-slate-950" />
      {/* Corner glow left */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-900/10 blur-3xl" />
      {/* Corner glow right */}
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-900/10 blur-3xl" />
      {/* Center ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-slate-900/20 blur-3xl" />
    </div>
  );
}

// ── Live System Status Bar ────────────────────────────────────

function SystemStatusBar() {
  const [time, setTime] = useState<string>("");
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    update();
    const t = setInterval(() => {
      update();
      setUptime((u) => u + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        SYSTEMS NOMINAL
      </span>
      <span className="hidden sm:block">UP {formatUptime(uptime)}</span>
      <span className="hidden md:block text-slate-500">{time}</span>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
  accentColor: "cyan" | "violet" | "emerald" | "amber" | "red";
}

const ACCENT_MAP = {
  cyan: {
    icon: "text-cyan-400",
    bg: "bg-cyan-500/8",
    border: "border-cyan-500/15",
    glow: "shadow-cyan-900/20",
    value: "text-cyan-300",
  },
  violet: {
    icon: "text-violet-400",
    bg: "bg-violet-500/8",
    border: "border-violet-500/15",
    glow: "shadow-violet-900/20",
    value: "text-violet-300",
  },
  emerald: {
    icon: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/15",
    glow: "shadow-emerald-900/20",
    value: "text-emerald-300",
  },
  amber: {
    icon: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/15",
    glow: "shadow-amber-900/20",
    value: "text-amber-300",
  },
  red: {
    icon: "text-red-400",
    bg: "bg-red-500/8",
    border: "border-red-500/15",
    glow: "shadow-red-900/20",
    value: "text-red-300",
  },
};

function StatCard({
  label,
  value,
  sublabel,
  icon,
  trend,
  accentColor,
}: StatCardProps) {
  const ac = ACCENT_MAP[accentColor];
  return (
    <div
      className={`relative rounded-2xl border ${ac.border} ${ac.bg} p-5 shadow-lg ${ac.glow} backdrop-blur-sm overflow-hidden group hover:border-opacity-50 transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`${ac.icon} opacity-70 group-hover:opacity-100 transition-opacity`}>
          {icon}
        </div>
        {trend && (
          <span
            className={`text-xs ${
              trend === "up"
                ? "text-emerald-400"
                : trend === "down"
                ? "text-red-400"
                : "text-slate-500"
            }`}
          >
            <TrendingUp className={`w-3.5 h-3.5 ${trend === "down" ? "rotate-180" : ""}`} />
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold font-mono ${ac.value} mb-0.5`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 uppercase tracking-widest">{label}</div>
      {sublabel && (
        <div className="text-xs text-slate-600 mt-0.5">{sublabel}</div>
      )}
      {/* Corner decoration */}
      <Hexagon
        className={`absolute -bottom-4 -right-4 w-16 h-16 ${ac.icon} opacity-[0.04]`}
        strokeWidth={0.5}
      />
    </div>
  );
}

// ── Records Tab Content ───────────────────────────────────────

function RecordsTab() {
  const outcomeConfig: Record<
    TriageLevel,
    { label: string; icon: React.ReactNode; color: string }
  > = {
    ADVISORY: {
      label: "Advisory",
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: "text-emerald-400",
    },
    INCONCLUSIVE: {
      label: "Inconclusive",
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-amber-400",
    },
    EMERGENCY: {
      label: "Emergency",
      icon: <ShieldAlert className="w-4 h-4" />,
      color: "text-red-400",
    },
    INTAKE: {
      label: "Incomplete",
      icon: <XCircle className="w-4 h-4" />,
      color: "text-slate-400",
    },
    HISTORY: {
      label: "In Progress",
      icon: <Clock className="w-4 h-4" />,
      color: "text-cyan-400",
    },
    ASSESSMENT: {
      label: "Assessed",
      icon: <BarChart2 className="w-4 h-4" />,
      color: "text-violet-400",
    },
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-center">
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {MOCK_RECORDS.length}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-widest">
            Total Sessions
          </div>
        </div>
        <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/20 p-4 text-center">
          <div className="text-2xl font-bold font-mono text-emerald-400 mb-1">
            {MOCK_RECORDS.filter((r) => !r.wasEmergency).length}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-widest">
            Non-Emergency
          </div>
        </div>
        <div className="rounded-xl border border-amber-800/30 bg-amber-950/20 p-4 text-center">
          <div className="text-2xl font-bold font-mono text-amber-400 mb-1">
            {MOCK_RECORDS.filter((r) => r.followUpRequired).length}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-widest">
            Follow-up Due
          </div>
        </div>
      </div>

      {/* Records list */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          Session History
        </h3>
        <div className="space-y-3">
          {MOCK_RECORDS.map((record) => {
            const config = outcomeConfig[record.triageOutcome] ??
              outcomeConfig.INTAKE;
            return (
              <div
                key={record.id}
                className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4 hover:border-slate-700/60 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white group-hover:text-cyan-100 transition-colors">
                      {record.chiefComplaint}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDate(record.date)}
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-medium flex-shrink-0 ${config.color}`}
                  >
                    {config.icon}
                    {config.label}
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {record.summary}
                </p>
                {record.followUpRequired && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400/80">
                    <Clock className="w-3 h-3" />
                    Follow-up consultation recommended
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-800/30 bg-slate-900/20 p-4">
        <Lock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Assessment records are stored locally on this device only. No personal
          health information is transmitted to or retained by MedNova servers beyond
          the active session.
        </p>
      </div>
    </div>
  );
}

// ── Sidebar Navigation ────────────────────────────────────────

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isEmergencyActive: boolean;
}

function Sidebar({ activeTab, onTabChange, isEmergencyActive }: SidebarProps) {
  return (
    <aside className="w-64 hidden lg:flex flex-col border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/40">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>
          <div>
            <p className="text-sm font-black text-white tracking-tight">MedNova</p>
            <p className="text-xs text-cyan-500 font-mono tracking-wider">AI · v2.4.1</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isEmergencyTab = tab.id === "emergency";
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group ${
                isActive
                  ? "bg-cyan-950/60 border border-cyan-700/40 text-cyan-300"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <span
                className={`flex-shrink-0 transition-colors ${
                  isActive
                    ? "text-cyan-400"
                    : isEmergencyTab && isEmergencyActive
                    ? "text-red-400"
                    : "text-slate-500 group-hover:text-slate-300"
                }`}
              >
                {tab.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tab.label}</p>
                <p
                  className={`text-xs truncate transition-colors ${
                    isActive ? "text-cyan-500/70" : "text-slate-600"
                  }`}
                >
                  {tab.description}
                </p>
              </div>
              {isEmergencyTab && isEmergencyActive && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              )}
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-cyan-500/60 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Section */}
      <div className="px-4 py-4 border-t border-slate-800/60 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-colors group">
          <div className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">Anonymous Session</p>
            <p className="text-xs text-slate-600">Privacy protected</p>
          </div>
          <Shield className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}

// ── Mobile Tab Bar ────────────────────────────────────────────

interface MobileTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isEmergencyActive: boolean;
}

function MobileTabBar({
  activeTab,
  onTabChange,
  isEmergencyActive,
}: MobileTabBarProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isEmergTab = tab.id === "emergency";
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors ${
                isActive ? "text-cyan-400" : "text-slate-500"
              }`}
            >
              <span className="relative">
                {tab.icon}
                {isEmergTab && isEmergencyActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </span>
              <span className="text-xs font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Top Header ────────────────────────────────────────────────

interface TopHeaderProps {
  activeTab: TabId;
  isEmergencyActive: boolean;
}

function TopHeader({ activeTab, isEmergencyActive }: TopHeaderProps) {
  const tab = TABS.find((t) => t.id === activeTab)!;

  return (
    <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
      {/* Left: Mobile logo + page title */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black text-white">MedNova</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            {tab.label}
            {isEmergencyActive && activeTab !== "emergency" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-950 border border-red-700/50 text-red-400 font-normal">
                Emergency Active
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500">{tab.description}</p>
        </div>
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-4">
        <SystemStatusBar />
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Stats Overview Row ────────────────────────────────────────

function StatsOverview() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="Sessions"
        value={MOCK_RECORDS.length}
        sublabel="All time"
        icon={<Activity className="w-5 h-5" />}
        trend="stable"
        accentColor="cyan"
      />
      <StatCard
        label="Advisories"
        value={MOCK_RECORDS.filter((r) => r.triageOutcome === "ADVISORY").length}
        sublabel="Resolved"
        icon={<CheckCircle2 className="w-5 h-5" />}
        trend="up"
        accentColor="emerald"
      />
      <StatCard
        label="Follow-ups"
        value={MOCK_RECORDS.filter((r) => r.followUpRequired).length}
        sublabel="Pending"
        icon={<Clock className="w-5 h-5" />}
        accentColor="amber"
      />
      <StatCard
        label="System"
        value="99.9%"
        sublabel="Uptime"
        icon={<Zap className="w-5 h-5" />}
        trend="stable"
        accentColor="violet"
      />
    </div>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("assessment");
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyFlags, setEmergencyFlags] = useState<string[]>([]);
  const [currentTriageLevel, setCurrentTriageLevel] =
    useState<TriageLevel>("INTAKE");

  const handleEmergencyDetected = useCallback((flags: string[]) => {
    setIsEmergencyActive(true);
    setEmergencyFlags(flags);
    // Auto-switch to emergency tab after brief delay
    setTimeout(() => setActiveTab("emergency"), 800);
  }, []);

  const handleTriageLevelChange = useCallback((level: TriageLevel) => {
    setCurrentTriageLevel(level);
    if (level === "EMERGENCY") {
      setIsEmergencyActive(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative">
      <BackgroundGrid />

      {/* ── Emergency Banner (full-width) ── */}
      {isEmergencyActive && activeTab !== "emergency" && (
        <div className="relative z-50 bg-red-950/90 border-b border-red-700/60 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-sm text-red-300 font-semibold">
              Emergency Protocol Activated
            </span>
            <span className="text-xs text-red-400/70">
              · Critical symptoms detected
            </span>
          </div>
          <button
            onClick={() => setActiveTab("emergency")}
            className="flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 font-semibold border border-red-700/50 rounded-lg px-3 py-1.5 hover:border-red-600/60 transition-colors"
          >
            View Emergency Hub
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="relative z-10 flex flex-1 h-full">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isEmergencyActive={isEmergencyActive}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 overflow-hidden">
          {/* Top Header */}
          <TopHeader activeTab={activeTab} isEmergencyActive={isEmergencyActive} />

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
            <div className="px-4 lg:px-6 py-6 max-w-5xl mx-auto w-full">

              {/* Stats Row (only on assessment + records) */}
              {(activeTab === "assessment" || activeTab === "records") && (
                <StatsOverview />
              )}

              {/* ── ASSESSMENT TAB ── */}
              {activeTab === "assessment" && (
                <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
                  {/* Panel header */}
                  <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/40 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          Clinical Assessment Engine
                        </p>
                        <p className="text-xs text-slate-500">
                          Powered by Gemini · Medically bounded AI
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 ${
                          currentTriageLevel === "EMERGENCY"
                            ? "bg-red-950/60 border-red-700/50 text-red-400"
                            : currentTriageLevel === "ADVISORY"
                            ? "bg-emerald-950/60 border-emerald-700/50 text-emerald-400"
                            : "bg-slate-800/60 border-slate-700/40 text-slate-400"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {currentTriageLevel}
                      </span>
                    </div>
                  </div>

                  {/* Wizard */}
                  <div className="min-h-[600px] flex flex-col">
                    <AssessmentWizard
                      onEmergencyDetected={handleEmergencyDetected}
                      onTriageLevelChange={handleTriageLevelChange}
                    />
                  </div>
                </div>
              )}

              {/* ── EMERGENCY TAB ── */}
              {activeTab === "emergency" && (
                <div>
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
                    <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                            isEmergencyActive
                              ? "bg-red-950 border-red-700/50"
                              : "bg-slate-800 border-slate-700/40"
                          }`}
                        >
                          <ShieldAlert
                            className={`w-4 h-4 ${
                              isEmergencyActive
                                ? "text-red-400 animate-pulse"
                                : "text-slate-400"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            Emergency Response Hub
                          </p>
                          <p className="text-xs text-slate-500">
                            ER locator · Emergency contacts · Vital monitoring
                          </p>
                        </div>
                      </div>
                      {isEmergencyActive && (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                          <span className="text-xs text-red-400 font-bold uppercase tracking-wider">
                            ACTIVE
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <EmergencyPanel
                        isActive={isEmergencyActive}
                        detectedFlags={emergencyFlags}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── RECORDS TAB ── */}
              {activeTab === "records" && (
                <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
                  <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/40 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          Assessment Records
                        </p>
                        <p className="text-xs text-slate-500">
                          Local session history · Never transmitted
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <RecordsTab />
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <MobileTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isEmergencyActive={isEmergencyActive}
      />
    </div>
  );
}

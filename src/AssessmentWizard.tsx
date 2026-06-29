"use client";

// ============================================================
// MedNova-AI — AssessmentWizard Component
// Dynamic multi-step clinical history wizard with AI chat
// ============================================================

import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Send,
  AlertTriangle,
  Loader2,
  User,
  Bot,
  RefreshCw,
  Info,
  CheckCircle2,
  ChevronDown,
  Stethoscope,
  ShieldAlert,
  ClipboardList,
  MessageSquare,
  BarChart3,
  Cpu,
} from "lucide-react";
import type {
  ConversationMessage,
  AITriageResponse,
  TriageLevel,
  CaseHistory,
  PatientDemographics,
  MedicalHistory,
  TriageAPIRequest,
  TriageAPIResponse,
} from "@/types/medical";
import {
  FollowUpResponseSchema,
  type FollowUpResponseFormData,
} from "@/types/medical";
import { detectRedFlagsInText } from "@/lib/medicalPrompt";

// ── Utilities ─────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Triage Level Config ───────────────────────────────────────

const TRIAGE_CONFIG: Record<
  TriageLevel,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    description: string;
  }
> = {
  INTAKE: {
    label: "Intake",
    color: "text-slate-400",
    bgColor: "bg-slate-800",
    borderColor: "border-slate-600",
    icon: <ClipboardList className="w-3.5 h-3.5" />,
    description: "Collecting initial information",
  },
  HISTORY: {
    label: "History Taking",
    color: "text-cyan-400",
    bgColor: "bg-cyan-950/50",
    borderColor: "border-cyan-700/50",
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    description: "Gathering comprehensive case history",
  },
  ASSESSMENT: {
    label: "Assessment",
    color: "text-violet-400",
    bgColor: "bg-violet-950/50",
    borderColor: "border-violet-700/50",
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    description: "Analyzing clinical data",
  },
  ADVISORY: {
    label: "Advisory",
    color: "text-emerald-400",
    bgColor: "bg-emerald-950/50",
    borderColor: "border-emerald-700/50",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    description: "Providing guidance",
  },
  INCONCLUSIVE: {
    label: "Inconclusive",
    color: "text-amber-400",
    bgColor: "bg-amber-950/50",
    borderColor: "border-amber-700/50",
    icon: <Info className="w-3.5 h-3.5" />,
    description: "Insufficient data for assessment",
  },
  EMERGENCY: {
    label: "EMERGENCY",
    color: "text-red-400",
    bgColor: "bg-red-950/50",
    borderColor: "border-red-600/60",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    description: "Critical — Contact emergency services",
  },
};

// ── Message Bubble Component ──────────────────────────────────

interface MessageBubbleProps {
  message: ConversationMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isEmergency = message.containsRedFlag;

  if (isEmergency && !isUser) {
    return (
      <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-950 border-2 border-red-500 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 max-w-lg">
          <div className="rounded-2xl rounded-tl-sm bg-red-950/60 border-2 border-red-500/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black text-red-400 uppercase tracking-widest animate-pulse">
                ⚠ EMERGENCY ALERT
              </span>
            </div>
            <p className="text-sm text-red-200 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          <span className="text-xs text-slate-600 ml-2 mt-1">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex gap-3 items-start flex-row-reverse animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-950 border border-cyan-700/50 flex items-center justify-center">
          <User className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 max-w-lg flex flex-col items-end">
          <div className="rounded-2xl rounded-tr-sm bg-cyan-950/60 border border-cyan-700/30 px-4 py-3 backdrop-blur-sm">
            <p className="text-sm text-cyan-50 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          <span className="text-xs text-slate-600 mr-2 mt-1">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-600/50 flex items-center justify-center">
        <Bot className="w-4 h-4 text-slate-300" />
      </div>
      <div className="flex-1 max-w-lg">
        <div className="rounded-2xl rounded-tl-sm bg-slate-800/70 border border-slate-700/40 px-4 py-3 backdrop-blur-sm">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <span className="text-xs text-slate-600 ml-2 mt-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-600/50 flex items-center justify-center">
        <Cpu className="w-4 h-4 text-slate-400 animate-pulse" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-slate-800/70 border border-slate-700/40 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
          <span className="text-xs text-slate-500 ml-1">Analyzing...</span>
        </div>
      </div>
    </div>
  );
}

// ── Data Quality Meter ────────────────────────────────────────

function DataQualityMeter({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 40
      ? "bg-amber-500"
      : "bg-slate-600";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 uppercase tracking-wider w-24">
        Data Quality
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-8 text-right ${
        pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-slate-500"
      }`}>
        {pct}%
      </span>
    </div>
  );
}

// ── Disclaimer Banner ─────────────────────────────────────────

function DisclaimerBanner() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border border-amber-800/30 bg-amber-950/20 overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-amber-950/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-500/80" />
          <span className="text-xs text-amber-500/80 font-medium">
            Medical Disclaimer
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-amber-500/60 transition-transform duration-200 ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
      </button>
      {!collapsed && (
        <div className="px-4 pb-3">
          <p className="text-xs text-amber-500/60 leading-relaxed">
            MedNova Clinical Assistant provides health information only. This is not a
            substitute for professional medical advice, diagnosis, or treatment. Never
            delay seeking professional care based on information from this tool. In a
            medical emergency, call emergency services immediately.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Initial Case History ──────────────────────────────────────

function buildInitialCaseHistory(): CaseHistory {
  return {
    sessionId: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    demographics: {
      ageGroup: "unspecified",
      biologicalSex: "unspecified",
    } as PatientDemographics,
    medicalHistory: {
      chronicConditions: [],
      currentMedications: [],
      knownAllergies: [],
      recentSurgeries: [],
      familyHistory: [],
      smokingStatus: "unspecified",
      alcoholUse: "unspecified",
    } as MedicalHistory,
    chiefComplaint: "",
    symptoms: [],
    conversationLog: [],
    currentTriageLevel: "INTAKE",
    questionsAsked: 0,
    isDataSufficient: false,
    detectedRedFlags: [],
  };
}

// ── Props ─────────────────────────────────────────────────────

interface AssessmentWizardProps {
  onEmergencyDetected?: (flags: string[]) => void;
  onTriageLevelChange?: (level: TriageLevel) => void;
}

// ── Main Component ────────────────────────────────────────────

export default function AssessmentWizard({
  onEmergencyDetected,
  onTriageLevelChange,
}: AssessmentWizardProps) {
  const formId = useId();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [caseHistory, setCaseHistory] = useState<CaseHistory>(
    buildInitialCaseHistory
  );
  const [currentTriageLevel, setCurrentTriageLevel] =
    useState<TriageLevel>("INTAKE");
  const [dataQualityScore, setDataQualityScore] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FollowUpResponseFormData>({
    resolver: zodResolver(FollowUpResponseSchema),
    defaultValues: { response: "" },
  });

  const inputValue = watch("response");

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Notify parent of triage level changes
  useEffect(() => {
    onTriageLevelChange?.(currentTriageLevel);
  }, [currentTriageLevel, onTriageLevelChange]);

  // Start the session with initial AI greeting
  const startSession = useCallback(async () => {
    setSessionStarted(true);
    setIsLoading(true);
    setError(null);

    const newHistory = buildInitialCaseHistory();
    setCaseHistory(newHistory);

    try {
      const body: TriageAPIRequest = {
        sessionId: newHistory.sessionId,
        userMessage: "Hello, I need a health assessment.",
        conversationHistory: [],
        caseHistory: newHistory,
        currentTriageLevel: "INTAKE",
      };

      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as TriageAPIResponse;

      if (!data.success || !data.data) {
        throw new Error(data.error ?? "Failed to initialize session");
      }

      const aiMsg: ConversationMessage = {
        id: generateId(),
        role: "assistant",
        content: data.data.message,
        timestamp: new Date(),
        triageLevel: data.data.triageLevel,
        containsRedFlag: data.data.isEmergency,
      };

      setMessages([aiMsg]);
      setCurrentTriageLevel(data.data.triageLevel);
      setDataQualityScore(data.data.dataQualityScore);
    } catch (err) {
      setError(
        "Failed to connect to the clinical assessment service. Please try again."
      );
      setSessionStarted(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle message submission
  const onSubmit = useCallback(
    async (data: FollowUpResponseFormData) => {
      if (isLoading) return;
      if (currentTriageLevel === "EMERGENCY") return;

      const userInput = data.response.trim();
      if (!userInput) return;

      // Client-side red flag check
      const clientFlags = detectRedFlagsInText(userInput);

      // Add user message immediately
      const userMsg: ConversationMessage = {
        id: generateId(),
        role: "user",
        content: userInput,
        timestamp: new Date(),
        triageLevel: currentTriageLevel,
        containsRedFlag: clientFlags.length > 0,
      };

      setMessages((prev) => [...prev, userMsg]);
      reset();
      setIsLoading(true);
      setError(null);

      // Build conversation history for API
      const history = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const updatedCaseHistory: Partial<CaseHistory> = {
        ...caseHistory,
        questionsAsked: caseHistory.questionsAsked,
        detectedRedFlags: [
          ...caseHistory.detectedRedFlags,
          ...clientFlags,
        ],
      };

      try {
        const reqBody: TriageAPIRequest = {
          sessionId: caseHistory.sessionId,
          userMessage: userInput,
          conversationHistory: history,
          caseHistory: updatedCaseHistory,
          currentTriageLevel,
        };

        const res = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const responseData = (await res.json()) as TriageAPIResponse;

        if (!responseData.success || !responseData.data) {
          throw new Error(responseData.error ?? "Assessment failed");
        }

        const aiReply = responseData.data;

        // Handle emergency
        if (aiReply.isEmergency) {
          const allFlags = [
            ...caseHistory.detectedRedFlags,
            ...clientFlags,
            ...aiReply.detectedRedFlags,
          ];
          onEmergencyDetected?.(allFlags);
        }

        const aiMsg: ConversationMessage = {
          id: generateId(),
          role: "assistant",
          content: aiReply.message,
          timestamp: new Date(),
          triageLevel: aiReply.triageLevel,
          containsRedFlag: aiReply.isEmergency,
        };

        setMessages((prev) => [...prev, aiMsg]);
        setCurrentTriageLevel(aiReply.triageLevel);
        setDataQualityScore(aiReply.dataQualityScore);

        // Update case history
        setCaseHistory((prev) => ({
          ...prev,
          updatedAt: new Date(),
          currentTriageLevel: aiReply.triageLevel,
          questionsAsked: prev.questionsAsked + 1,
          detectedRedFlags: [
            ...new Set([
              ...prev.detectedRedFlags,
              ...aiReply.detectedRedFlags,
            ]),
          ],
        }));
      } catch (err) {
        setError(
          "Unable to reach the clinical assessment service. Please check your connection."
        );
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [
      isLoading,
      currentTriageLevel,
      messages,
      caseHistory,
      reset,
      onEmergencyDetected,
    ]
  );

  const handleReset = useCallback(() => {
    setMessages([]);
    setCurrentTriageLevel("INTAKE");
    setDataQualityScore(0);
    setSessionStarted(false);
    setError(null);
    reset();
  }, [reset]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    },
    [handleSubmit, onSubmit]
  );

  const triageConfig = TRIAGE_CONFIG[currentTriageLevel];
  const isEmergencyActive = currentTriageLevel === "EMERGENCY";
  const isTerminalState =
    currentTriageLevel === "EMERGENCY" ||
    currentTriageLevel === "ADVISORY" ||
    currentTriageLevel === "INCONCLUSIVE";

  // ── Pre-session State ──
  if (!sessionStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-8 text-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Stethoscope className="w-10 h-10 text-cyan-500" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-2">
            MedNova Clinical Assessment
          </h2>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            Our AI clinical assistant will guide you through a comprehensive
            symptom evaluation. This is not a diagnostic tool — it helps you
            understand when and where to seek care.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2 text-left">
          {[
            "Comprehensive case history gathering",
            "Evidence-based triage guidance",
            "Emergency escalation when needed",
            "Zero medication recommendations",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <button
          onClick={startSession}
          className="px-8 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-lg shadow-cyan-900/40 hover:shadow-cyan-900/60 flex items-center gap-2"
        >
          <Stethoscope className="w-4 h-4" />
          Begin Assessment
        </button>

        <DisclaimerBanner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[600px]">

      {/* ── Header Status Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 bg-slate-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${triageConfig.bgColor} ${triageConfig.borderColor} ${triageConfig.color}`}
          >
            {triageConfig.icon}
            {triageConfig.label}
          </div>
          <span className="text-xs text-slate-600 hidden sm:block">
            {triageConfig.description}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block w-40">
            <DataQualityMeter score={dataQualityScore} />
          </div>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            title="Reset assessment"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2.5 rounded-xl border border-red-800/40 bg-red-950/30 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Emergency Frozen State ── */}
      {isEmergencyActive && (
        <div className="mx-4 mb-4 rounded-xl border-2 border-red-600/50 bg-red-950/40 p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
            <span className="text-red-400 font-bold text-sm uppercase tracking-wider">
              Assessment Suspended
            </span>
          </div>
          <p className="text-xs text-red-300/80 mb-3">
            Emergency protocol activated. Please contact emergency services immediately.
            When safe, you can start a new assessment.
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
          >
            Start New Assessment
          </button>
        </div>
      )}

      {/* ── Terminal (Advisory/Inconclusive) Action ── */}
      {(currentTriageLevel === "ADVISORY" ||
        currentTriageLevel === "INCONCLUSIVE") && (
        <div className="mx-4 mb-4 rounded-xl border border-slate-700/40 bg-slate-900/40 p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Assessment complete. Start a new session for another concern.
          </p>
          <button
            onClick={handleReset}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-xs hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            New Session
          </button>
        </div>
      )}

      {/* ── Input Area ── */}
      {!isEmergencyActive && !isTerminalState && (
        <div className="border-t border-slate-800/50 p-4 bg-slate-900/40 backdrop-blur-sm">
          <form
            id={formId}
            onSubmit={handleSubmit(onSubmit)}
            className="flex gap-3 items-end"
          >
            <div className="flex-1 relative">
              <textarea
                {...register("response")}
                ref={(e) => {
                  register("response").ref(e);
                  (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current =
                    e;
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Describe your symptoms or answer the question above..."
                disabled={isLoading}
                className="w-full resize-none rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-100 placeholder-slate-500 text-sm px-4 py-3 pr-12 focus:outline-none focus:border-cyan-600/60 focus:ring-1 focus:ring-cyan-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 max-h-32 overflow-y-auto"
                style={{
                  height: "auto",
                  minHeight: "48px",
                }}
              />
              {errors.response && (
                <p className="absolute -bottom-5 left-0 text-xs text-red-400">
                  {errors.response.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputValue?.trim()}
              className="flex-shrink-0 p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all duration-200 shadow-lg shadow-cyan-900/30"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <p className="text-xs text-slate-600 mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <div className="px-4 pb-4">
        <DisclaimerBanner />
      </div>
    </div>
  );
}
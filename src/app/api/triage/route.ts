// ============================================================
// MedNova-AI — /api/triage Route Handler
// Next.js 14 App Router — Edge-compatible Route Handler
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  detectRedFlagsInText,
  sanitizeAIResponse,
  EMERGENCY_FALLBACK_RESPONSE,
  INCONCLUSIVE_FALLBACK_RESPONSE,
} from "@/lib/medicalPrompt";
import type {
  TriageAPIRequest,
  TriageAPIResponse,
  AITriageResponse,
  TriageLevel,
} from "@/types/medical";

// ── Runtime Configuration ─────────────────────────────────────

export const runtime = "edge"; // Use Vercel Edge for lowest latency

// ── Rate Limiting (simple in-memory for edge) ─────────────────

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count += 1;
  return true;
}

// ── Request Validation ────────────────────────────────────────

function validateRequest(body: unknown): body is TriageAPIRequest {
  if (!body || typeof body !== "object") return false;
  const req = body as Record<string, unknown>;

  return (
    typeof req.sessionId === "string" &&
    req.sessionId.length > 0 &&
    typeof req.userMessage === "string" &&
    req.userMessage.length > 0 &&
    req.userMessage.length <= 2000 &&
    Array.isArray(req.conversationHistory) &&
    typeof req.currentTriageLevel === "string"
  );
}

// ── Client-Side Safety Pre-Check ──────────────────────────────

function performSafetyPreCheck(
  userMessage: string,
  currentTriageLevel: TriageLevel
): {
  hasRedFlag: boolean;
  detectedFlags: string[];
} {
  // If already in emergency, keep it there
  if (currentTriageLevel === "EMERGENCY") {
    return {
      hasRedFlag: true,
      detectedFlags: ["session already in emergency state"],
    };
  }

  const detectedFlags = detectRedFlagsInText(userMessage);
  return {
    hasRedFlag: detectedFlags.length > 0,
    detectedFlags,
  };
}

// ── Sanitize User Input ───────────────────────────────────────

function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Basic XSS prevention (belt and suspenders)
    .slice(0, 2000);
}

// ── Build Messages for AI ─────────────────────────────────────

function buildAIMessages(
  request: TriageAPIRequest
): Array<{ role: "user" | "assistant"; content: string }> {
  const history = request.conversationHistory.slice(-12); // Last 12 turns (context window management)

  // Validate history roles
  const validatedHistory = history
    .filter(
      (msg) =>
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.length > 0
    )
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: sanitizeUserInput(msg.content),
    }));

  return [
    ...validatedHistory,
    {
      role: "user" as const,
      content: sanitizeUserInput(request.userMessage),
    },
  ];
}

// ── Call Google Gemini API ────────────────────────────────────

async function callGeminiAPI(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Convert messages to Gemini format
  const geminiContents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: geminiContents,
    generationConfig: {
      temperature: 0.1,        // Low temperature for clinical precision
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE", // Allow medical content — we handle safety ourselves
      },
    ],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000), // 30s timeout
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
      finishReason?: string;
    }>;
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts?.[0]?.text) {
    throw new Error("Gemini returned empty response.");
  }

  return candidate.content.parts[0].text;
}



// ── Parse & Validate AI Response ─────────────────────────────

function parseAndValidateAIResponse(
  rawText: string,
  hasRedFlagPreCheck: boolean,
  detectedPreCheckFlags: string[]
): AITriageResponse {
  const sanitized = sanitizeAIResponse(rawText);

  let parsed: Partial<AITriageResponse>;
  try {
    parsed = JSON.parse(sanitized) as Partial<AITriageResponse>;
  } catch {
    // If AI didn't return valid JSON and we detected red flags, return emergency
    if (hasRedFlagPreCheck) {
      return {
        ...EMERGENCY_FALLBACK_RESPONSE,
        detectedRedFlags: detectedPreCheckFlags,
      };
    }
    // Otherwise inconclusive
    return { ...INCONCLUSIVE_FALLBACK_RESPONSE };
  }

  // Enforce emergency override — if our pre-check found red flags,
  // the AI MUST be in emergency mode regardless of what it returned
  if (hasRedFlagPreCheck) {
    return {
      message:
        "⚠ EMERGENCY ALERT: Based on the symptoms you've described, you may be experiencing a serious or life-threatening medical emergency. Call emergency services IMMEDIATELY — dial 911 (US), 112 (EU), or 999 (UK). Do not wait. If possible, sit or lie down and keep calm while help arrives.",
      triageLevel: "EMERGENCY",
      followUpQuestions: [],
      detectedRedFlags: [
        ...detectedPreCheckFlags,
        ...(Array.isArray(parsed.detectedRedFlags) ? parsed.detectedRedFlags : []),
      ],
      isEmergency: true,
      isInconclusive: false,
      safetyAdvice: null,
      dataQualityScore: 0,
      bodySystems: Array.isArray(parsed.bodySystems) ? parsed.bodySystems : [],
      disclaimer:
        "MedNova Clinical Assistant provides health information only. This is not a substitute for professional medical advice, diagnosis, or treatment. Always seek guidance from a qualified healthcare provider. In an emergency, call your local emergency services immediately.",
    };
  }

  // Validate and coerce triage level
  const validTriageLevels: TriageLevel[] = [
    "INTAKE",
    "HISTORY",
    "ASSESSMENT",
    "ADVISORY",
    "INCONCLUSIVE",
    "EMERGENCY",
  ];

  const triageLevel: TriageLevel = validTriageLevels.includes(
    parsed.triageLevel as TriageLevel
  )
    ? (parsed.triageLevel as TriageLevel)
    : "INCONCLUSIVE";

  // Enforce emergency consistency
  const isEmergency = triageLevel === "EMERGENCY" || Boolean(parsed.isEmergency);

  // Safety: if AI claims emergency, validate it has an appropriate message
  let message =
    typeof parsed.message === "string" && parsed.message.length > 0
      ? parsed.message
      : isEmergency
      ? EMERGENCY_FALLBACK_RESPONSE.message
      : INCONCLUSIVE_FALLBACK_RESPONSE.message;

  // ── Truncation guard for ADVISORY ──────────────────────────
  // If the AI wrote a message that ends with a colon or is < 100 chars in ADVISORY,
  // it was truncated. Append a fallback continuation so the user gets something useful.
  if (
    triageLevel === "ADVISORY" &&
    !isEmergency &&
    (message.trimEnd().endsWith(":") ||
      message.trimEnd().endsWith("—") ||
      message.length < 100)
  ) {
    message +=
      "\n\n**General self-care guidance:**\n" +
      "• Rest the affected area and avoid activities that worsen the discomfort.\n" +
      "• Apply a cold pack (wrapped in cloth) for 15–20 minutes if swelling or acute pain is present, or gentle warmth if the area feels stiff or cramped.\n" +
      "• Stay well hydrated and maintain regular meals to support recovery.\n" +
      "• Avoid straining or overusing the affected area for the next 24–48 hours.\n" +
      "• Monitor for any worsening: increased pain, swelling, numbness, discolouration, or fever.\n\n" +
      "**When to seek professional care:**\n" +
      "• If symptoms worsen significantly or do not improve within 48–72 hours, please consult a general physician.\n" +
      "• If you develop any new symptoms such as fever, chest pain, difficulty breathing, or loss of sensation, seek immediate medical attention.\n\n" +
      "This guidance is for general informational purposes only and does not replace professional medical evaluation.";
  }

  return {
    message,
    triageLevel: isEmergency ? "EMERGENCY" : triageLevel,
    followUpQuestions: isEmergency
      ? []
      : Array.isArray(parsed.followUpQuestions)
      ? (parsed.followUpQuestions as string[]).slice(0, 3)
      : [],
    detectedRedFlags: Array.isArray(parsed.detectedRedFlags)
      ? (parsed.detectedRedFlags as string[])
      : [],
    isEmergency,
    isInconclusive:
      triageLevel === "INCONCLUSIVE" || Boolean(parsed.isInconclusive),
    safetyAdvice:
      isEmergency || triageLevel === "INCONCLUSIVE"
        ? null
        : typeof parsed.safetyAdvice === "string"
        ? parsed.safetyAdvice
        : null,
    dataQualityScore:
      typeof parsed.dataQualityScore === "number"
        ? Math.min(100, Math.max(0, parsed.dataQualityScore))
        : 0,
    bodySystems: Array.isArray(parsed.bodySystems)
      ? parsed.bodySystems.filter((s): s is string => typeof s === "string")
      : [],
    disclaimer:
      typeof parsed.disclaimer === "string"
        ? parsed.disclaimer
        : "MedNova Clinical Assistant provides health information only. This is not a substitute for professional medical advice, diagnosis, or treatment. Always seek guidance from a qualified healthcare provider. In an emergency, call your local emergency services immediately.",
  };
}

// ── POST Handler ──────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<TriageAPIResponse>> {
  // ── Rate Limiting ──
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json<TriageAPIResponse>(
      {
        success: false,
        error: "Rate limit exceeded. Please wait a moment before trying again.",
        errorCode: "RATE_LIMIT",
      },
      { status: 429 }
    );
  }

  // ── Parse Body ──
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<TriageAPIResponse>(
      {
        success: false,
        error: "Invalid JSON in request body.",
        errorCode: "VALIDATION_ERROR",
      },
      { status: 400 }
    );
  }

  // ── Validate Request ──
  if (!validateRequest(body)) {
    return NextResponse.json<TriageAPIResponse>(
      {
        success: false,
        error: "Request validation failed. Missing or invalid required fields.",
        errorCode: "VALIDATION_ERROR",
      },
      { status: 400 }
    );
  }

  const request = body as TriageAPIRequest;

  // ── Safety Pre-Check ──
  const { hasRedFlag, detectedFlags } = performSafetyPreCheck(
    request.userMessage,
    request.currentTriageLevel
  );

  // If red flag detected, we can short-circuit without calling AI
  // (faster and more reliable for emergencies)
  if (hasRedFlag) {
    return NextResponse.json<TriageAPIResponse>(
      {
        success: true,
        data: {
          ...EMERGENCY_FALLBACK_RESPONSE,
          detectedRedFlags: detectedFlags,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-MedNova-Safety": "EMERGENCY_TRIGGERED",
        },
      }
    );
  }

  // ── Build System Prompt ──
  const systemPrompt = buildSystemPrompt(
    request.currentTriageLevel,
    request.caseHistory?.questionsAsked ?? 0,
    request.caseHistory
  );

  // ── Build Messages ──
  const messages = buildAIMessages(request);

  // ── Call AI (Gemini → OpenAI fallback) ──
  let rawAIResponse: string;

  try {
    rawAIResponse = await callGeminiAPI(systemPrompt, messages);
  } catch (geminiError) {
    console.error("[MedNova] Gemini API failed:", geminiError);

    return NextResponse.json<TriageAPIResponse>(
      {
        success: false,
        error:
          "Clinical assessment service is temporarily unavailable. If you are experiencing a medical emergency, call emergency services immediately.",
        errorCode: "AI_UNAVAILABLE",
      },
      { status: 503 }
    );
  }

  // ── Parse & Validate AI Response ──
  const triageResponse = parseAndValidateAIResponse(
    rawAIResponse,
    hasRedFlag,
    detectedFlags
  );

  return NextResponse.json<TriageAPIResponse>(
    {
      success: true,
      data: triageResponse,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-MedNova-Triage": triageResponse.triageLevel,
      },
    }
  );
}

// ── GET Handler (Health Check) ────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "operational",
      service: "MedNova Triage API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

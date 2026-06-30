// ============================================================
// MedNova-AI — Medical Domain Types
// Strict TypeScript interfaces for the entire diagnostic pipeline
// ============================================================

// ── Enumerations ─────────────────────────────────────────────

export type TriageLevel =
  | "INTAKE"         // Collecting initial chief complaint
  | "HISTORY"        // Gathering comprehensive case history
  | "ASSESSMENT"     // AI is processing / analyzing
  | "ADVISORY"       // Safe lifestyle guidance being shown
  | "INCONCLUSIVE"   // Insufficient data — flagged explicitly
  | "EMERGENCY";     // Red-flag symptoms detected — halt all flow

export type SeverityScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type BodySystem =
  | "cardiovascular"
  | "respiratory"
  | "neurological"
  | "gastrointestinal"
  | "musculoskeletal"
  | "dermatological"
  | "genitourinary"
  | "endocrine"
  | "psychiatric"
  | "immunological"
  | "ophthalmological"
  | "ENT"
  | "general";

export type OnsetType =
  | "sudden"         // < 1 hour
  | "acute"          // hours to 1 day
  | "subacute"       // 2–7 days
  | "chronic"        // > 1 week
  | "recurrent";     // episodic

export type MessageRole = "user" | "assistant" | "system";

// ── Red-Flag Symptom Registry ─────────────────────────────────

export const RED_FLAG_KEYWORDS: readonly string[] = [
  "chest pain",
  "chest tightness",
  "cannot breathe",
  "can't breathe",
  "difficulty breathing",
  "shortness of breath",
  "severe shortness",
  "sudden numbness",
  "facial droop",
  "arm weakness",
  "sudden severe headache",
  "worst headache",
  "thunderclap headache",
  "loss of consciousness",
  "passed out",
  "unresponsive",
  "seizure",
  "coughing blood",
  "vomiting blood",
  "blood in stool",
  "severe abdominal pain",
  "suicidal",
  "want to die",
  "overdose",
  "poisoning",
  "anaphylaxis",
  "throat swelling",
  "can't swallow",
  "severe allergic",
  "stroke",
  "heart attack",
  "cardiac arrest",
  "crushing pressure",
  "radiating pain",
  "left arm pain",
  "jaw pain",
  "high fever",          // > 104°F / 40°C combined with other symptoms
  "neck stiffness",
  "light sensitivity",
  "sudden vision loss",
  "double vision",
  "slurred speech",
  "confusion",
  "altered consciousness",
  "severe bleeding",
  "won't stop bleeding",
  "deep cut",
  "trauma",
  "accident",
  "fall from height",
] as const;

// ── Patient Context ───────────────────────────────────────────

export interface PatientDemographics {
  ageGroup:
    | "pediatric_infant"   // 0–2
    | "pediatric_child"    // 3–12
    | "adolescent"         // 13–17
    | "adult_young"        // 18–35
    | "adult_middle"       // 36–60
    | "senior"             // 61–74
    | "elderly"            // 75+
    | "unspecified";
  biologicalSex: "male" | "female" | "intersex" | "unspecified";
  pregnancyStatus?: "pregnant" | "possibly_pregnant" | "not_pregnant" | "unknown";
}

export interface MedicalHistory {
  chronicConditions: string[];
  currentMedications: string[];       // Names noted for context ONLY — never recommended
  knownAllergies: string[];
  recentSurgeries: string[];
  familyHistory: string[];
  smokingStatus: "never" | "former" | "current" | "unspecified";
  alcoholUse: "none" | "social" | "regular" | "heavy" | "unspecified";
}

// ── Symptom Structures ────────────────────────────────────────

export interface SymptomReport {
  id: string;
  description: string;
  bodySystem: BodySystem;
  onset: OnsetType;
  durationDays: number | null;
  severity: SeverityScore;
  character: string;                // e.g., "throbbing", "burning", "dull"
  aggravatingFactors: string[];
  relievingFactors: string[];
  associatedSymptoms: string[];
  temporalPattern: string;          // e.g., "worse in mornings", "constant"
  isRedFlag: boolean;
}

// ── Conversation Message ──────────────────────────────────────

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  triageLevel: TriageLevel;
  containsRedFlag?: boolean;
}

// ── Case History Accumulator ──────────────────────────────────

export interface CaseHistory {
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  demographics: PatientDemographics;
  medicalHistory: MedicalHistory;
  chiefComplaint: string;
  symptoms: SymptomReport[];
  conversationLog: ConversationMessage[];
  currentTriageLevel: TriageLevel;
  questionsAsked: number;
  isDataSufficient: boolean;
  detectedRedFlags: string[];
}

// ── AI Response Payload ───────────────────────────────────────

export interface AITriageResponse {
  message: string;
  triageLevel: TriageLevel;
  followUpQuestions: string[];
  detectedRedFlags: string[];
  isEmergency: boolean;
  isInconclusive: boolean;
  safetyAdvice: string | null;
  dataQualityScore: number;          // 0–100: completeness of case history
  bodySystems: BodySystem[];
  disclaimer: string;
}

// ── API Request / Response ────────────────────────────────────

export interface TriageAPIRequest {
  sessionId: string;
  userMessage: string;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  caseHistory: Partial<CaseHistory>;
  currentTriageLevel: TriageLevel;
}

export interface TriageAPIResponse {
  success: boolean;
  data?: AITriageResponse;
  error?: string;
  errorCode?: "SAFETY_HALT" | "RATE_LIMIT" | "AI_UNAVAILABLE" | "VALIDATION_ERROR";
}

// ── Emergency Contact ─────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  type: "national_emergency" | "poison_control" | "mental_health" | "ambulance" | "personal";
  country: string;
  isAvailable24h: boolean;
}

// ── Nearby Facility ───────────────────────────────────────────

export interface NearbyFacility {
  id: string;
  name: string;
  type: "emergency_room" | "urgent_care" | "hospital" | "clinic";
  address: string;
  distance: string;
  distanceKm: number;
  phone: string;
  isOpen: boolean;
  estimatedWait?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  availableBeds?: number;
  icuAvailable?: boolean;
  emergencyAvailable?: boolean;
  traumaCenter?: boolean;
  rating?: number;
  website?: string;
  recommendationScore?: number;
  recommendationReason?: string;
  isRecommended?: boolean;
}

// ── Vital Signs Tracking ──────────────────────────────────────

export interface VitalSigns {
  timestamp: Date;
  heartRate?: number;           // bpm
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;          // Celsius
  oxygenSaturation?: number;    // %
  respiratoryRate?: number;      // breaths/min
  painScore?: SeverityScore;
}

// ── Assessment Record (for Records Tab) ──────────────────────

export interface AssessmentRecord {
  id: string;
  date: Date;
  chiefComplaint: string;
  triageOutcome: TriageLevel;
  summary: string;
  wasEmergency: boolean;
  followUpRequired: boolean;
}

// ── Form Schemas (used with React Hook Form + Zod) ────────────

import { z } from "zod";

export const ChiefComplaintSchema = z.object({
  complaint: z
    .string()
    .min(5, "Please describe your symptoms in at least 5 characters.")
    .max(500, "Please keep your initial description under 500 characters.")
    .trim(),
});

export const PatientDemographicsSchema = z.object({
  ageGroup: z.enum([
    "pediatric_infant",
    "pediatric_child",
    "adolescent",
    "adult_young",
    "adult_middle",
    "senior",
    "elderly",
    "unspecified",
  ]),
  biologicalSex: z.enum(["male", "female", "intersex", "unspecified"]),
  pregnancyStatus: z
    .enum(["pregnant", "possibly_pregnant", "not_pregnant", "unknown"])
    .optional(),
});

export const FollowUpResponseSchema = z.object({
  response: z
    .string()
    .min(1, "Please provide a response.")
    .max(1000, "Response too long. Please be more concise.")
    .trim(),
});

export type ChiefComplaintFormData = z.infer<typeof ChiefComplaintSchema>;
export type PatientDemographicsFormData = z.infer<typeof PatientDemographicsSchema>;
export type FollowUpResponseFormData = z.infer<typeof FollowUpResponseSchema>;

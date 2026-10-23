export type NavigationTab = 'home' | 'vault' | 'notes' | 'assistant' | 'settings';

export type StudyAction = 'review_completed' | 'note_created' | 'quiz_correct';

export interface StudyEvent {
  id: string;          // Kunci idempoten per aksi dan entitas (misal: "review_completed:link-1")
  dayKey: string;      // YYYY-MM-DD dari getMonotonicDayKey()
  action: StudyAction;
  entityId: string;
  occurredAt: number;
}

export interface StudyProgress {
  currentStreakDays: number;
  longestStreakDays: number;
  lastStudyDay: string | null;
}

export type CosmeticSlot = 'head' | 'face' | 'back';
export type CosmeticId = 'sakura_ribbon' | 'chef_hat' | 'explorer_backpack';

export interface CosmeticInventory {
  unlocked: CosmeticId[];
  equipped: Partial<Record<CosmeticSlot, CosmeticId>>;
}

export interface PetIdentity {
  adoptedAt: number | null;       // null jika tanggal asli tidak diketahui
  trackingStartedAt: number;
  cosmetics: CosmeticInventory;
}

export interface Pet {
  name: string;
  level: number;
  exp: number;
  expToNextLevel: number;
  hunger: number; // 0 - 100 (Satiety / Tingkat Kenyang: min 50 di Safe Haven)
  mood: number;   // 0 - 100 (Afeksi dasar)
  energy: number; // 0 - 100 (Energi / Stamina: min 35 di Safe Haven)
  state: 'idle' | 'feeding' | 'happy' | 'sleeping';
  streakDays: number;
  lastFedAt?: number;
  lastActiveAt?: number;
  lastDecayAt?: number;
  isSleeping?: boolean;
  sleepSchedule?: {
    startHour: number; // e.g. 23 (23:00)
    endHour: number;   // e.g. 7 (07:00)
  };
  lastCareDate?: string; // YYYY-MM-DD
  version?: number;
  identity?: PetIdentity;
  cosmetics?: CosmeticInventory;
}

export type PlatformType = 'youtube' | 'tiktok' | 'instagram' | 'threads' | 'web';
export type LinkStatus = 'to_review' | 'in_progress' | 'completed';

export interface KeyTakeaway {
  concept: string;
  explanation: string;
}

export type CaptureMethod = 'share_sheet' | 'bot_chat' | 'manual_paste' | 'import_json';
export type EvidenceLevel = 'full_text' | 'excerpt' | 'metadata_only' | 'url_only';
export type GatewayErrorType =
  | 'network_error'
  | 'timeout'
  | 'unauthorized'
  | 'rate_limited'
  | 'server_error'
  | 'invalid_response';

export type LinkQualityStatus = 'grounded' | 'needs_context' | 'bookmark_only' | 'draft' | 'gateway_error';

export type LinkProvenance =
  | 'video_analysis'
  | 'caption_and_video'
  | 'audio_transcript'
  | 'caption_and_audio'
  | 'caption'
  | 'manual_context'
  | 'youtube_transcript'
  | 'none';

export interface SavedLink {
  id: string;
  url: string;
  title: string;
  platform: PlatformType;
  domain: string;
  tags: string[];
  status: LinkStatus;
  dateAdded: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
  summary?: string;
  thumbnailUrl?: string;
  category?: string;
  coreThesis?: string;
  keyTakeaways?: KeyTakeaway[];
  actionableInsights?: string[];
  reflectionPrompt?: string;
  author?: string;
  captureMethod?: CaptureMethod;
  evidenceLevel?: EvidenceLevel;
  qualityStatus?: LinkQualityStatus;
  provenance?: LinkProvenance;
  sourceExcerpt?: string;
  synthesizedAt?: number;
  gatewayErrorType?: GatewayErrorType;
  gatewayErrorMessage?: string;
  gatewayErrorAction?: string;
  gatewayHttpStatus?: number;
}

export interface QuizQuestion {
  id: string;
  sourceTitle: string;
  platform: PlatformType;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  updatedAt: string;
  createdAt: number;
  updatedAtTimestamp: number;
  color?: 'cream' | 'peach' | 'lavender' | 'mint' | 'pink';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    targetTab: NavigationTab;
  };
}

export interface DailyGoal {
  id: string;
  label: string;
  isCompleted: boolean;
  xpReward: number;
  hasClaimedXp?: boolean;
}

export interface RewardLedgerEntry {
  id: string; // e.g. "quiz:quiz-1", "link_mastered:link-1", "goal:2026-10-17:goal-2", "link_save:2026-10-17:link-1"
  category: 'quiz' | 'habit' | 'link_mastered' | 'link_save' | 'link_review' | 'note_save' | 'daily_care' | 'learning_variety';
  entityId: string;
  xpAwarded: number;
  awardedAt: number;
}

export interface QuizHistoryEntry {
  id: string;
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  answeredAt: number;
}

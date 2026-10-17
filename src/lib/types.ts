export type NavigationTab = 'home' | 'vault' | 'notes' | 'assistant';

export interface Pet {
  name: string;
  level: number;
  exp: number;
  expToNextLevel: number;
  hunger: number; // 0 - 100
  mood: number;   // 0 - 100
  energy: number; // 0 - 100
  state: 'idle' | 'feeding' | 'happy' | 'sleeping';
  streakDays: number;
  lastFedAt?: number;
  lastActiveAt?: number;
  lastDecayAt?: number;
}

export type PlatformType = 'youtube' | 'tiktok' | 'instagram' | 'web';
export type LinkStatus = 'to_review' | 'in_progress' | 'completed';

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
  category: 'quiz' | 'habit' | 'link_mastered' | 'link_save';
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

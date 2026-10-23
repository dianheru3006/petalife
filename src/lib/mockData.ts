import type { Pet, SavedLink, QuizQuestion, Note, ChatMessage, DailyGoal } from './types';

export const initialPet: Pet = {
  name: 'Mochi',
  level: 3,
  exp: 140,
  expToNextLevel: 200,
  hunger: 70,
  mood: 85,
  energy: 90,
  state: 'idle',
  streakDays: 0,
  identity: {
    adoptedAt: null,
    trackingStartedAt: 1718000000000,
    cosmetics: {
      unlocked: [],
      equipped: {},
    },
  },
};

export const initialSavedLinks: SavedLink[] = [
  {
    id: 'link-1',
    url: 'https://youtube.com/shorts/clean-arch-fast',
    title: '3 Rules of Clean Architecture in 60 Seconds',
    platform: 'youtube',
    domain: 'YouTube Shorts',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    tags: ['coding', 'tech', 'architecture'],
    status: 'to_review',
    dateAdded: 'Today, 09:30 AM',
    createdAt: 1718000000000,
    updatedAt: 1718000000000,
    notes: 'Remember dependency inversion and keeping domain pure.',
    summary: 'Key rules: separation of concerns, inward dependencies, testability.'
  },
  {
    id: 'link-2',
    url: 'https://tiktok.com/@chef_dimsum/recipe-sauce',
    title: 'Authentic Sweet & Savory Chili Oil Dimsum Sauce',
    platform: 'tiktok',
    domain: 'TikTok',
    thumbnailUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80',
    tags: ['cooking', 'recipes', 'dimsum'],
    status: 'in_progress',
    dateAdded: 'Yesterday',
    createdAt: 1717900000000,
    updatedAt: 1717900000000,
    notes: 'Try making this on the weekend with fresh garlic.',
    summary: 'Mix infused garlic oil, gochugaru, light soy sauce, and a dash of rice vinegar.'
  },
  {
    id: 'link-3',
    url: 'https://instagram.com/reels/cashflow-101',
    title: 'How to Manage Cashflow for Solo Startups with Zero Debt',
    platform: 'instagram',
    domain: 'Instagram Reels',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    tags: ['business', 'finance', 'startup'],
    status: 'completed',
    dateAdded: '3 days ago',
    createdAt: 1717800000000,
    updatedAt: 1717800000000,
    notes: 'Keep at least 6 months runway in liquid assets before hiring.',
    summary: 'Rule of thumb: 50% operations, 30% safety reserve, 20% growth experimentation.'
  },
  {
    id: 'link-4',
    url: 'https://uxdesign.cc/micro-interactions-for-apps',
    title: 'The Psychology of Wholesome Delight in Mobile Games',
    platform: 'web',
    domain: 'uxdesign.cc',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
    tags: ['design', 'psychology', 'gaming'],
    status: 'to_review',
    dateAdded: '4 days ago',
    createdAt: 1717700000000,
    updatedAt: 1717700000000,
    notes: 'Check spring physics and gentle squashing for 2D character reactions.',
    summary: 'Delight comes from feedback responsiveness within 100ms and organic easing.'
  }
];

export const sampleQuizQuestions: QuizQuestion[] = [
  {
    id: 'quiz-1',
    sourceTitle: '3 Rules of Clean Architecture in 60 Seconds',
    platform: 'youtube',
    question: 'According to clean architecture principles, which layer should contain your core business logic with zero framework dependencies?',
    options: [
      'The Domain / Entities Layer',
      'The Database Driver Layer',
      'The Web UI Controller Layer',
      'The External Third-Party SDKs'
    ],
    correctIndex: 0,
    explanation: 'The Domain/Entities layer sits at the center and should never depend on frameworks, databases, or UI.',
    xpReward: 35
  },
  {
    id: 'quiz-2',
    sourceTitle: 'How to Manage Cashflow for Solo Startups',
    platform: 'instagram',
    question: 'What is the recommended runway reserve before aggressive expansion in a bootstrapped solo business?',
    options: [
      '1 to 2 weeks of operational costs',
      'At least 6 months of liquid cash runway',
      'Rely completely on credit cards',
      'Immediately spend all revenue on paid ads'
    ],
    correctIndex: 1,
    explanation: 'A 6-month liquid runway protects you from unexpected market dips and seasonality.',
    xpReward: 35
  }
];

export const initialNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Ideas for Weekend Dimsum Cooking',
    body: '1. Buy dumpling wrappers from the Asian market.\n2. Prepare shrimp and minced chicken filling.\n3. Make the chili oil infused with star anise and spring onions.',
    tags: ['cooking', 'weekend', 'to-try'],
    updatedAt: '2 hours ago',
    createdAt: 1718000000000,
    updatedAtTimestamp: 1718000000000,
    color: 'peach'
  },
  {
    id: 'note-2',
    title: 'Petalife Architecture Guidelines',
    body: 'Keep UI completely separate from the game state engine. For Phase 0, all states reside in reactive React memory. Make sure touch targets are >44px for cozy thumb use.',
    tags: ['coding', 'petalife', 'architecture'],
    updatedAt: 'Yesterday',
    createdAt: 1717900000000,
    updatedAtTimestamp: 1717900000000,
    color: 'lavender'
  },
  {
    id: 'note-3',
    title: 'Quote of the Day',
    body: '“Consistency beats intensity. Ten minutes of focused daily recall is worth five hours of weekend cramming.”',
    tags: ['inspiration', 'habits'],
    updatedAt: '3 days ago',
    createdAt: 1717800000000,
    updatedAtTimestamp: 1717800000000,
    color: 'mint'
  }
];

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'assistant',
    text: "Halo! Aku Mochi. Aku bisa membantu mencari materi di Pustaka dan merangkum catatanmu. Mau mulai dari mana?",
    timestamp: '10:00 AM',
    suggestedAction: {
      label: 'Buka Pustaka',
      targetTab: 'vault'
    }
  }
];

export const initialDailyGoals: DailyGoal[] = [
  { id: 'goal-1', label: 'Save 1 learning link today', isCompleted: false, xpReward: 20 },
  { id: 'goal-2', label: 'Feed Mochi his morning snack', isCompleted: false, xpReward: 15 },
  { id: 'goal-3', label: 'Review 1 saved video in Vault', isCompleted: false, xpReward: 25 },
  { id: 'goal-4', label: 'Jot down 1 reflection note', isCompleted: false, xpReward: 20 },
];

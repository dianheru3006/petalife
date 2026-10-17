# Petalife — Phase 0 Foundation & UI Prototype 🐾

A cozy, mobile-first 2D virtual-pet learning vault web application prototype built with **React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide Icons**.

---

## 🌟 Overview & Concept

Petalife combines:
1. **Mochi (Virtual Pet Companion):** An original 2D creature with idle breathing, eye blinking, feeding animations, and mood/hunger progression.
2. **Content Vault:** Quick link capture for YouTube Shorts, TikTok, Instagram Reels, and web articles, with domain badges and status tags.
3. **Daily Quiz Review:** Active recall multiple-choice quizzes that reward XP to Mochi upon completion.
4. **Personal Notes:** A cozy pastel notes editor with color tints and tags.
5. **AI Assistant Demo:** A conversational study helper with quick prompts and simulated learning insights.

---

## 🎨 Visual Identity & Design System

- **Background:** Warm cream (`#FDFBF7`) with gentle sunbeam gradients.
- **Accents:** Soft peach (`#FED7C5`), lavender (`#DCD6F3`), mint (`#CCEBD6`), and blush pink (`#FAD0DC`).
- **Typography:** `Plus Jakarta Sans` for body, `Nunito` for playful headers.
- **Motion:** CSS micro-interactions for breathing, chewing, floating hearts, and gentle leaf swaying (with full `prefers-reduced-motion` support).

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173/`.

### 3. Production Build & Linting
```bash
# Type check and build
npm run build

# Run Oxlint
npm run lint
```

---

## 📁 Architecture & File Structure

```
src/
├── app/
│   ├── App.tsx             # Root state orchestrator
│   └── layout/
│       ├── AppLayout.tsx   # Responsive wrapper
│       ├── Sidebar.tsx     # Desktop navigation sidebar
│       └── BottomNav.tsx   # Mobile navigation bar
├── components/
│   ├── ui/
│   │   ├── Badge.tsx       # Pastel status badges
│   │   ├── Button.tsx      # Friendly rounded buttons with active scaling
│   │   └── ProgressBar.tsx # Pastel gradient progress bars
│   ├── shared/
│   │   └── Header.tsx      # Top bar with title and streak chip
│   └── pet/
│       ├── MochiPet.tsx    # Original 2D vector character (Idle & Feeding)
│       └── PetRoom.tsx     # Cozy room stage with meters and Feeding CTA
├── features/
│   ├── dashboard/
│   │   └── DashboardPage.tsx # Pet room, habits checklist, and recent items
│   ├── vault/
│   │   └── VaultPage.tsx     # Link capture, platform detector, filters
│   ├── quiz/
│   │   └── QuizPage.tsx      # Multiple-choice active recall with XP rewards
│   ├── notes/
│   │   └── NotesPage.tsx     # Pastel notes editor with tags and search
│   └── assistant/
│       └── AssistantPage.tsx # Chat interface with mock AI responses
└── lib/
    ├── types.ts            # Strict domain TypeScript interfaces
    ├── mockData.ts         # High-fidelity initial demo state
    └── utils.ts            # Helper utilities and URL platform detector
```

---

## ✅ Phase 0 Definition of Done Checklist

- [x] Application starts cleanly and builds with 0 TypeScript and 0 linter errors.
- [x] All 5 destinations accessible: Home, Vault, Quiz, Notes, and AI Assistant.
- [x] Pet Room with original vector character ("Mochi") with idle and feeding states.
- [x] Content Vault can add new URLs, validate domains, filter, and search.
- [x] Daily Quiz handles multiple-choice answers, explanations, and awards +35 XP to Mochi.
- [x] Notes page allows creating, color-coding, and filtering notes in local state.
- [x] AI Assistant demo provides instant responses to suggested and custom study prompts.
- [x] Responsive layout with desktop sidebar and mobile bottom navigation.

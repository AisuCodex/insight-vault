# RTL SnapSolve - AI-Powered Knowledge Base

A smart, searchable, AI-powered knowledge base for storing solutions, installation guides, and upgrade procedures. Built with React, TypeScript, and Lovable Cloud.

## Features

- **Solutions Tab**: Store and search troubleshooting solutions
- **Installation Guides Tab**: Step-by-step software installation instructions
- **Upgrades Tab**: Version upgrade procedures and migration guides
- **AI Assistant (RTLAI)**: 
  - Natural language search across all content
  - Image upload for error analysis
  - Context-aware conversations
  - Structured, actionable responses
- **User Management**: Admin approval system for user accounts
- **Dark/Light Theme**: Toggle between themes

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Backend**: Lovable Cloud (Supabase)
- **AI**: Lovable AI Gateway (Gemini 2.5 Flash)
- **Authentication**: Supabase Auth with admin approval

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── AIQueryPanel.tsx
│   ├── SolutionCard.tsx
│   ├── InstallationGuideCard.tsx
│   ├── UpgradeCard.tsx
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useAuth.tsx     # Authentication hook
│   └── use-toast.ts    # Toast notifications
├── pages/              # Page components
│   ├── Index.tsx       # Solutions page
│   ├── InstallationGuides.tsx
│   ├── Upgrades.tsx
│   ├── Admin.tsx
│   └── Auth.tsx
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and types
├── lib/                # Utility functions
└── index.css           # Global styles and theme tokens

supabase/
├── functions/          # Edge functions
│   └── ai-search/      # AI search endpoint
└── config.toml         # Supabase configuration
```

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or bun package manager
- VS Code (recommended) with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin (Volar)

## Getting Started

### 1. Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Setup

The project uses Lovable Cloud, which automatically provides environment variables. If running locally, create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### 4. Start Development Server

```bash
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Database Schema

### Tables

- **solutions**: Troubleshooting solutions with title, description, images
- **installation_guides**: Step-by-step installation procedures
- **upgrades**: Version upgrade procedures
- **profiles**: User profiles with approval status
- **user_roles**: Admin role assignments
- **ai_conversations**: AI chat history
- **ai_messages**: Individual AI messages

### Row-Level Security (RLS)

All tables have RLS enabled:
- Public read access for content tables
- Write access requires approved user or admin
- User-specific data (conversations) is private

## Authentication Flow

1. User registers with email
2. Account starts in "pending" status
3. Admin approves/disapproves via Admin panel
4. Approved users can create/edit content
5. Pending/disapproved users see appropriate messages

## AI Integration

The AI assistant uses Lovable AI Gateway with Gemini 2.5 Flash:
- Searches across solutions, guides, and upgrades
- Supports image upload for error analysis
- Maintains conversation context
- Returns structured, actionable responses

## Development Tips

### Adding New Components

1. Create component in `src/components/`
2. Use shadcn/ui base components from `src/components/ui/`
3. Follow existing patterns for styling with Tailwind

### Adding New Pages

1. Create page in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in Index.tsx header

### Modifying Database

Use Lovable's migration tool for schema changes. Never edit `types.ts` directly.

## Deployment

Deploy via Lovable:
1. Open your Lovable project
2. Click Share → Publish
3. Your app is live!

## Contributing

1. Make changes in Lovable or locally
2. Test thoroughly
3. Commit and push changes
4. Changes sync automatically with Lovable

## Support

For issues or questions:
- Use the AI assistant within the app
- Check existing solutions in the knowledge base
- Contact the admin team

---

Built with ❤️ using [Lovable](https://lovable.dev)

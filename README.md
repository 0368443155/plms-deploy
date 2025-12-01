# notion-clone-nextjs

![GitHub repo size](https://img.shields.io/github/repo-size/evanch98/notion-clone-nextjs)
![GitHub stars](https://img.shields.io/github/stars/evanch98/notion-clone-nextjs?style=social)
![GitHub forks](https://img.shields.io/github/forks/evanch98/notion-clone-nextjs?style=social)

<br />
**Updated:** December, 2025 <br />
A powerful Notion Clone web application built with Next.js, React, Tailwind CSS, TypeScript, Convex, Clerk Auth, Edge Store, and Zustand.

> 🎯 **Enhanced Version:** This project now includes comprehensive documentation for implementing **19 use cases** covering user management, document editing, tables, calendar, notifications, and AI features.

## 📚 Documentation

**NEW!** Comprehensive implementation guides:
- 📊 [**IMPLEMENTATION_ANALYSIS.md**](./IMPLEMENTATION_ANALYSIS.md) - Complete system analysis and architecture
- 📖 [**USE_CASES_DETAILED.md**](./USE_CASES_DETAILED.md) - Detailed use cases with activity diagrams
- 🗺️ [**ROADMAP.md**](./ROADMAP.md) - Sprint-by-sprint implementation plan
- 🚀 [**QUICK_START.md**](./QUICK_START.md) - Quick start guide
- 📋 [**README_DOCUMENTATION.md**](./README_DOCUMENTATION.md) - Documentation overview

## ✨ Features

### Core Features (Implemented ✅)
- **Document Management**
  - Create, edit, and organize notes in a Notion-like interface
  - Nested documents (parent-child relationships)
  - Rich text editing with BlockNote
  - Icon and cover image support
  - Soft delete with trash/restore functionality
  - Real-time updates using Convex
  
- **User Authentication**
  - Sign up / Sign in with Clerk Auth
  - OAuth providers (Google, GitHub)
  - Session management
  - Secure logout

- **Search & Organization**
  - Full-text search across documents
  - Sidebar navigation
  - Archive/restore documents

- **File Management**
  - File upload and storage using Edge Store
  - Image optimization

- **UI/UX**
  - Responsive design with Tailwind CSS
  - Dark mode support
  - Beautiful animations
  - State management using Zustand

### Planned Features (See [ROADMAP.md](./ROADMAP.md))
- 🔄 **User Management** (Sprint 1)
  - Profile management
  - Password change
  - Password reset
  
- 🔄 **Excel-like Tables** (Sprint 2-3)
  - Create custom tables
  - Import/export Excel/CSV
  - Dynamic columns and rows
  - Cell editing
  
- 🔄 **Calendar System** (Sprint 4-5)
  - Weekly schedule management
  - Event management
  - Unified calendar view
  - Deadline tracking
  
- 🔄 **Notifications** (Sprint 6)
  - Real-time notifications
  - Deadline reminders
  - System notifications
  
- 🔄 **AI Features** (Sprint 7-8)
  - Document summarization (Gemini AI)
  - Q&A chat on documents
  - Context-aware responses

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Convex account ([convex.dev](https://convex.dev))
- Clerk account ([clerk.com](https://clerk.com))
- EdgeStore account ([edgestore.dev](https://edgestore.dev))

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/evanch98/notion-clone-nextjs.git
cd notion-clone-nextjs
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**

Create a `.env.local` file:
```env
# Convex
CONVEX_DEPLOYMENT=your_deployment
NEXT_PUBLIC_CONVEX_URL=your_convex_url

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# EdgeStore
EDGE_STORE_ACCESS_KEY=your_edgestore_key
EDGE_STORE_SECRET_KEY=your_edgestore_secret

# Optional: For AI features
GEMINI_API_KEY=your_gemini_key
```

4. **Run the development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)**

### For Full Implementation

See [**QUICK_START.md**](./QUICK_START.md) for detailed setup instructions including:
- Additional dependencies installation
- Database schema migration
- Webhook configuration
- AI features setup

## 📖 Use Cases

This project implements 19 comprehensive use cases:

### Authentication & User Management (UC01-UC06)
1. ✅ Login
2. ✅ Register
3. ✅ Logout
4. 🔄 Forgot Password
5. 🔄 Update Profile
6. 🔄 Change Password

### Document Management (UC07-UC13)
7. ✅ Create Page
8. ✅ Update Page
9. ✅ Edit Content
10. ✅ Read Content
11. ✅ Delete Page
12. ✅ Restore/Permanent Delete
13. ✅ Search Pages

### Advanced Features (UC14-UC19)
14. 🔄 Manage Tables (Excel-like)
15. 🔄 Manage Schedule
16. 🔄 View Calendar
17. 🔄 Notifications
18. 🔄 AI Summarization
19. 🔄 AI Q&A Chat

**Legend:** ✅ Implemented | 🔄 Planned (See Roadmap)

## 🏗️ Architecture

### Tech Stack
- **Frontend:** Next.js 13 (App Router), React 18, TypeScript
- **Styling:** TailwindCSS, Radix UI, Shadcn UI
- **Backend:** Convex (Real-time database)
- **Auth:** Clerk
- **Storage:** EdgeStore
- **State:** Zustand
- **Editor:** BlockNote
- **AI:** Google Gemini (planned)

### Database Schema
See [convex/schema_new.ts](./convex/schema_new.ts) for the complete schema including:
- 21 tables
- 60+ optimized indexes
- Support for all 19 use cases

## 📊 Project Status

- **Current Version:** 1.0 (Base implementation)
- **Implemented:** 10/19 use cases (52.6%)
- **In Progress:** Documentation complete, ready for full implementation
- **Timeline:** 8-10 weeks for full implementation (solo developer)

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Linting
npm run lint
```

## 📦 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Setup
1. Add all environment variables in Vercel dashboard
2. Configure Convex production deployment
3. Configure Clerk production instance
4. Setup custom domain (optional)

See [IMPLEMENTATION_ANALYSIS.md](./IMPLEMENTATION_ANALYSIS.md) for detailed deployment checklist.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgements

### Libraries
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Convex](https://www.convex.dev/)
- [Clerk Auth](https://clerk.com/)
- [Edge Store](https://edgestore.dev/)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [BlockNote](https://www.blocknotejs.org/)
- [Radix UI](https://www.radix-ui.com/)
- [Shadcn UI](https://ui.shadcn.com/)

### Packages
- [class-variance-authority](https://www.npmjs.com/package/class-variance-authority)
- [clsx](https://www.npmjs.com/package/clsx)
- [cmdk](https://www.npmjs.com/package/cmdk)
- [emoji-picker-react](https://www.npmjs.com/package/emoji-picker-react)
- [lucide-react](https://www.npmjs.com/package/lucide-react)
- [react-dropzone](https://www.npmjs.com/package/react-dropzone)
- [react-textarea-autosize](https://www.npmjs.com/package/react-textarea-autosize)
- [sonner](https://www.npmjs.com/package/sonner)
- [tailwind-merge](https://www.npmjs.com/package/tailwind-merge)
- [usehooks-ts](https://www.npmjs.com/package/usehooks-ts)
- [zod](https://www.npmjs.com/package/zod)

## 📧 Contact

For questions or support:
- Create an issue on GitHub
- Check the [documentation](./README_DOCUMENTATION.md)
- Review [troubleshooting guide](./QUICK_START.md#troubleshooting)

---

**Made with ❤️ using Next.js and Convex**

**Original Author:** [evanch98](https://github.com/evanch98)  
**Enhanced Documentation:** December 2025
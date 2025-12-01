# ROADMAP TRIỂN KHAI CHI TIẾT - NOTION CLONE

## Tổng quan
- **Thời gian dự kiến:** 8-9 tuần (2-2.5 tháng)
- **Số use cases:** 19
- **Đã hoàn thành:** 10/19 (52.6%)
- **Cần triển khai:** 9/19 (47.4%)

---

## SPRINT 0: CHUẨN BỊ (3-5 ngày)

### Checklist

#### Setup & Configuration
- [ ] Review toàn bộ code hiện tại
- [ ] Backup database hiện tại
- [ ] Tạo branch mới: `feature/full-implementation`
- [ ] Update dependencies
  ```bash
  npm install xlsx react-data-grid papaparse
  npm install react-big-calendar date-fns
  npm install @google/generative-ai
  npm install react-hook-form zod
  npm install use-debounce react-idle-timer
  ```

#### Database Migration
- [ ] Backup schema hiện tại
- [ ] Review `convex/schema_new.ts`
- [ ] Plan migration strategy
- [ ] Test migration in development
- [ ] Deploy new schema to Convex

#### Environment Setup
- [ ] Add new environment variables:
  ```env
  # Existing
  CONVEX_DEPLOYMENT=
  NEXT_PUBLIC_CONVEX_URL=
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
  CLERK_SECRET_KEY=
  EDGE_STORE_ACCESS_KEY=
  EDGE_STORE_SECRET_KEY=
  
  # New
  GEMINI_API_KEY=
  CLERK_WEBHOOK_SECRET=
  ```
- [ ] Get Gemini API key from Google AI Studio
- [ ] Configure Clerk webhooks

#### Documentation
- [ ] Read `IMPLEMENTATION_ANALYSIS.md`
- [ ] Read `USE_CASES_DETAILED.md`
- [ ] Create development log file
- [ ] Setup issue tracking (GitHub Issues/Trello)

---

## SPRINT 1: USER MANAGEMENT (1 tuần)

### Mục tiêu
Hoàn thiện quản lý người dùng: Profile, Change Password, Forgot Password

### Checklist

#### Day 1-2: UC05 - Cập nhật thông tin cá nhân

**Backend:**
- [ ] Tạo `convex/users.ts`
  - [ ] `getProfile` query
  - [ ] `updateProfile` mutation
  - [ ] `createUser` mutation (for webhook)
- [ ] Test Convex functions

**Frontend:**
- [ ] Tạo `app/(main)/(routes)/profile/page.tsx`
- [ ] Tạo `app/(main)/(routes)/profile/_components/profile-form.tsx`
- [ ] Tạo `app/(main)/(routes)/profile/_components/avatar-upload.tsx`
- [ ] Integrate với EdgeStore
- [ ] Add validation với Zod
- [ ] Test form submission
- [ ] Test avatar upload

**Testing:**
- [ ] Test validation (empty name, invalid file)
- [ ] Test upload (JPG, PNG, > 5MB)
- [ ] Test update success
- [ ] Test error handling

#### Day 3: UC06 - Đổi mật khẩu

**Frontend:**
- [ ] Tạo `app/(main)/(routes)/settings/page.tsx`
- [ ] Tạo `app/(main)/(routes)/settings/_components/change-password-form.tsx`
- [ ] Integrate Clerk password update API
- [ ] Add validation
- [ ] Test password change flow

**Testing:**
- [ ] Test wrong old password
- [ ] Test password mismatch
- [ ] Test password too short
- [ ] Test success case

#### Day 4: UC04 - Quên mật khẩu

**Configuration:**
- [ ] Enable password reset in Clerk Dashboard
- [ ] Customize email template
- [ ] Configure OTP timeout (5 minutes)
- [ ] Test email delivery

**Frontend:**
- [ ] Update sign-in page with "Forgot Password" link
- [ ] Test reset flow
- [ ] Test OTP validation
- [ ] Test password reset

#### Day 5: Enhancements cho UC01-03

**Auto Logout:**
- [ ] Tạo `hooks/use-idle-timer.tsx`
- [ ] Integrate vào `app/layout.tsx`
- [ ] Test idle detection
- [ ] Test auto logout after 120 minutes

**Rate Limiting:**
- [ ] Tạo `convex/auth.ts`
- [ ] Implement `trackLoginAttempt` mutation
- [ ] Add login logs schema
- [ ] Test rate limiting (5 failed attempts)
- [ ] Test account lock (30 minutes)

**Activity Logging:**
- [ ] Add logging to login/logout
- [ ] Create admin dashboard to view logs (optional)

#### Day 6-7: Testing & Bug Fixes
- [ ] Integration testing
- [ ] Fix bugs
- [ ] Code review
- [ ] Documentation
- [ ] Deploy to staging

---

## SPRINT 2-3: TABLES FEATURE (2-3 tuần)

### Mục tiêu
UC14 - Quản lý bảng dữ liệu (Excel-like tables)

### Week 1: Core Table CRUD

#### Day 1-2: Database & API

**Backend:**
- [ ] Review tables schema (tables, tableColumns, tableRows, tableCells)
- [ ] Tạo `convex/tables.ts`
  - [ ] `getTables` query
  - [ ] `getTableById` query
  - [ ] `createTable` mutation
  - [ ] `updateTable` mutation
  - [ ] `deleteTable` mutation
- [ ] Tạo `convex/tableColumns.ts`
  - [ ] `createColumn` mutation
  - [ ] `updateColumn` mutation
  - [ ] `deleteColumn` mutation
  - [ ] `reorderColumns` mutation
- [ ] Tạo `convex/tableRows.ts`
  - [ ] `createRow` mutation
  - [ ] `deleteRow` mutation
  - [ ] `reorderRows` mutation
- [ ] Tạo `convex/tableCells.ts`
  - [ ] `updateCell` mutation
  - [ ] `getCellsByRow` query

**Testing:**
- [ ] Test all CRUD operations
- [ ] Test data integrity
- [ ] Test cascade delete (table → columns → rows → cells)

#### Day 3-5: Basic UI

**Frontend:**
- [ ] Tạo `app/(main)/(routes)/tables/page.tsx` (list view)
- [ ] Tạo `app/(main)/(routes)/tables/_components/table-list.tsx`
- [ ] Tạo `app/(main)/(routes)/tables/_components/create-table-modal.tsx`
- [ ] Tạo `app/(main)/(routes)/tables/[tableId]/page.tsx` (table view)
- [ ] Tạo `app/(main)/(routes)/tables/_components/table-grid.tsx`
- [ ] Add basic grid rendering
- [ ] Add column headers
- [ ] Add row numbers

**Testing:**
- [ ] Test table creation
- [ ] Test table list
- [ ] Test navigation

### Week 2: Excel-like Grid

#### Day 1-3: Grid Editing

**Frontend:**
- [ ] Install `react-data-grid`
- [ ] Integrate react-data-grid
- [ ] Implement cell editing
- [ ] Implement column resizing
- [ ] Implement row selection
- [ ] Add context menu (right-click)
  - [ ] Insert row above/below
  - [ ] Delete row
  - [ ] Insert column left/right
  - [ ] Delete column

**Testing:**
- [ ] Test cell editing
- [ ] Test keyboard navigation (Tab, Enter, Arrow keys)
- [ ] Test copy/paste (optional)

#### Day 4-5: Column Types

**Backend:**
- [ ] Support column types:
  - [ ] Text
  - [ ] Number
  - [ ] Date
  - [ ] Select (dropdown)
  - [ ] Checkbox

**Frontend:**
- [ ] Tạo `app/(main)/(routes)/tables/_components/column-type-selector.tsx`
- [ ] Implement cell renderers for each type
- [ ] Implement cell editors for each type
- [ ] Add validation per type

**Testing:**
- [ ] Test each column type
- [ ] Test type validation

### Week 3: Excel Import & Polish

#### Day 1-3: Excel/CSV Import

**Backend:**
- [ ] Install `xlsx` and `papaparse`
- [ ] Tạo `convex/tableImport.ts`
  - [ ] `parseExcelFile` mutation
  - [ ] `importTableData` mutation
- [ ] Implement Excel parsing logic
- [ ] Implement CSV parsing logic

**Frontend:**
- [ ] Tạo `app/(main)/(routes)/tables/_components/import-excel-modal.tsx`
- [ ] Add file upload
- [ ] Show preview before import
- [ ] Handle import errors

**Testing:**
- [ ] Test Excel import (.xlsx)
- [ ] Test CSV import (.csv)
- [ ] Test large files (1000+ rows)
- [ ] Test error cases (invalid format, corrupted file)

#### Day 4-5: Performance & Polish

**Optimization:**
- [ ] Add pagination (100 rows per page)
- [ ] Add virtualization for large tables
- [ ] Optimize queries
- [ ] Add loading states

**UI/UX:**
- [ ] Add table search/filter
- [ ] Add column sorting
- [ ] Add export to Excel/CSV
- [ ] Improve styling
- [ ] Add keyboard shortcuts

**Testing:**
- [ ] Load test with 10,000 rows
- [ ] Test pagination
- [ ] Test search/filter
- [ ] Test export

#### Day 6-7: Testing & Deployment
- [ ] Integration testing
- [ ] Bug fixes
- [ ] Code review
- [ ] Documentation
- [ ] Deploy to staging

---

## SPRINT 4-5: CALENDAR SYSTEM (2 tuần)

### Mục tiêu
UC15 - Quản lý lịch học, UC16 - Xem lịch tổng quan

### Week 1: UC15 - Quản lý lịch học

#### Day 1-2: Schedules Backend

**Backend:**
- [ ] Review schedules schema
- [ ] Tạo `convex/schedules.ts`
  - [ ] `getSchedules` query
  - [ ] `getSchedulesByDay` query
  - [ ] `createSchedule` mutation
  - [ ] `updateSchedule` mutation
  - [ ] `deleteSchedule` mutation
  - [ ] `checkTimeConflict` helper

**Testing:**
- [ ] Test CRUD operations
- [ ] Test time conflict detection

#### Day 3-5: Schedules Frontend

**Frontend:**
- [ ] Tạo `app/(main)/(routes)/schedule/page.tsx`
- [ ] Tạo `app/(main)/(routes)/schedule/_components/schedule-grid.tsx`
- [ ] Tạo `app/(main)/(routes)/schedule/_components/schedule-item.tsx`
- [ ] Tạo `app/(main)/(routes)/schedule/_components/add-schedule-modal.tsx`
- [ ] Tạo `app/(main)/(routes)/schedule/_components/edit-schedule-modal.tsx`
- [ ] Implement weekly grid layout (Mon-Sun columns, Time rows)
- [ ] Add color coding by subject
- [ ] Add drag-and-drop (optional)

**Testing:**
- [ ] Test schedule creation
- [ ] Test time validation (start < end)
- [ ] Test conflict detection
- [ ] Test schedule editing
- [ ] Test schedule deletion

### Week 2: UC16 - Xem lịch tổng quan

#### Day 1-2: Events Backend

**Backend:**
- [ ] Review events schema
- [ ] Tạo `convex/events.ts`
  - [ ] `getEvents` query
  - [ ] `getEventsByDateRange` query
  - [ ] `createEvent` mutation
  - [ ] `updateEvent` mutation
  - [ ] `deleteEvent` mutation
- [ ] Tạo `convex/calendar.ts`
  - [ ] `getCalendarData` query (merge schedules + events)
  - [ ] `expandSchedulesToEvents` helper

**Testing:**
- [ ] Test event CRUD
- [ ] Test date range queries
- [ ] Test merge logic

#### Day 3-5: Calendar Frontend

**Frontend:**
- [ ] Install `react-big-calendar` and `date-fns`
- [ ] Tạo `app/(main)/(routes)/calendar/page.tsx`
- [ ] Tạo `app/(main)/(routes)/calendar/_components/calendar-view.tsx`
- [ ] Tạo `app/(main)/(routes)/calendar/_components/month-view.tsx`
- [ ] Tạo `app/(main)/(routes)/calendar/_components/week-view.tsx`
- [ ] Tạo `app/(main)/(routes)/calendar/_components/add-event-modal.tsx`
- [ ] Tạo `app/(main)/(routes)/calendar/_components/event-details-modal.tsx`
- [ ] Integrate react-big-calendar
- [ ] Implement month/week view toggle
- [ ] Add color coding (schedules vs events)
- [ ] Add event click → details modal

**Testing:**
- [ ] Test calendar rendering
- [ ] Test view switching
- [ ] Test event creation
- [ ] Test event editing
- [ ] Test navigation (prev/next month)

#### Day 6-7: Testing & Deployment
- [ ] Integration testing
- [ ] Bug fixes
- [ ] Code review
- [ ] Documentation
- [ ] Deploy to staging

---

## SPRINT 6: NOTIFICATIONS (1 tuần)

### Mục tiêu
UC17 - Nhận và xem thông báo

### Checklist

#### Day 1-2: Notifications Backend

**Backend:**
- [ ] Review notifications schema
- [ ] Tạo `convex/notifications.ts`
  - [ ] `getNotifications` query
  - [ ] `getUnreadCount` query
  - [ ] `markAsRead` mutation
  - [ ] `markAllAsRead` mutation
  - [ ] `deleteNotification` mutation
  - [ ] `createNotification` mutation (internal)
- [ ] Tạo `convex/crons.ts`
  - [ ] `generateDeadlineReminders` cron job (daily)
  - [ ] `cleanupOldNotifications` cron job (weekly)

**Testing:**
- [ ] Test notification CRUD
- [ ] Test unread count
- [ ] Test mark as read

#### Day 3-4: Notifications Frontend

**Frontend:**
- [ ] Tạo `components/notifications/notification-bell.tsx`
- [ ] Tạo `components/notifications/notification-dropdown.tsx`
- [ ] Tạo `components/notifications/notification-item.tsx`
- [ ] Tạo `app/(main)/(routes)/notifications/page.tsx`
- [ ] Add bell icon to navbar
- [ ] Add unread badge
- [ ] Implement dropdown list
- [ ] Add "Mark all as read" button
- [ ] Add click → navigate to related page

**Testing:**
- [ ] Test notification display
- [ ] Test unread badge
- [ ] Test mark as read
- [ ] Test navigation

#### Day 5: Cron Jobs & Reminders

**Backend:**
- [ ] Setup Convex cron jobs
- [ ] Implement reminder generation logic
  - [ ] Check events in next 1-3 days
  - [ ] Create notifications
  - [ ] Avoid duplicates
- [ ] Test cron execution

**Testing:**
- [ ] Test cron job execution
- [ ] Test reminder creation
- [ ] Test duplicate prevention

#### Day 6-7: Real-time & Polish

**Frontend:**
- [ ] Add real-time updates (Convex subscriptions)
- [ ] Add notification sound (optional)
- [ ] Add browser notifications (optional)
- [ ] Improve styling

**Testing:**
- [ ] Test real-time updates
- [ ] Integration testing
- [ ] Bug fixes
- [ ] Deploy to staging

---

## SPRINT 7-8: AI FEATURES (2 tuần)

### Mục tiêu
UC18 - Tóm tắt nội dung, UC19 - Hỏi đáp trên tài liệu

### Week 1: UC18 - Tóm tắt nội dung

#### Day 1-2: Setup & Backend

**Setup:**
- [ ] Get Gemini API key
- [ ] Add to environment variables
- [ ] Install `@google/generative-ai`

**Backend:**
- [ ] Review aiSummaries schema
- [ ] Tạo `convex/ai.ts`
  - [ ] `summarizeDocument` mutation
  - [ ] `getSummaryCache` query
  - [ ] `extractPlainText` helper
  - [ ] `generateContentHash` helper

**Testing:**
- [ ] Test Gemini API connection
- [ ] Test summarization
- [ ] Test caching

#### Day 3-5: Frontend

**Frontend:**
- [ ] Tạo `components/ai/summarize-button.tsx`
- [ ] Tạo `components/ai/summary-modal.tsx`
- [ ] Add button to document page
- [ ] Implement loading state
- [ ] Implement error handling
- [ ] Add copy to clipboard

**Testing:**
- [ ] Test summarization flow
- [ ] Test error cases (too short, API error)
- [ ] Test loading states

### Week 2: UC19 - Hỏi đáp trên tài liệu

#### Day 1-3: Chat Backend

**Backend:**
- [ ] Review chatSessions and chatMessages schemas
- [ ] Tạo `convex/chat.ts`
  - [ ] `createSession` mutation
  - [ ] `getSession` query
  - [ ] `getMessages` query
  - [ ] `sendMessage` mutation
  - [ ] `buildContextualPrompt` helper
- [ ] Implement context-aware prompting
- [ ] Add token counting
- [ ] Add usage tracking

**Testing:**
- [ ] Test chat session creation
- [ ] Test message sending
- [ ] Test context awareness
- [ ] Test token counting

#### Day 4-7: Chat Frontend

**Frontend:**
- [ ] Tạo `components/ai/chat-button.tsx`
- [ ] Tạo `components/ai/chat-sidebar.tsx`
- [ ] Tạo `components/ai/chat-message.tsx`
- [ ] Tạo `components/ai/chat-input.tsx`
- [ ] Implement chat UI
- [ ] Add message bubbles
- [ ] Add typing indicator
- [ ] Add auto-scroll
- [ ] Add streaming responses (optional)

**Testing:**
- [ ] Test chat flow
- [ ] Test message display
- [ ] Test context retention
- [ ] Test error handling

#### Day 8-10: Polish & Optimization

**Optimization:**
- [ ] Implement token management
- [ ] Add usage limits/quotas
- [ ] Optimize prompts
- [ ] Add response caching

**UI/UX:**
- [ ] Improve styling
- [ ] Add copy response button
- [ ] Add regenerate button
- [ ] Add clear chat button

**Testing:**
- [ ] Integration testing
- [ ] Load testing
- [ ] Bug fixes
- [ ] Deploy to staging

---

## SPRINT 9: POLISH & LAUNCH (1 tuần)

### Mục tiêu
Hoàn thiện, tối ưu hóa và triển khai production

### Checklist

#### Day 1-2: Performance Optimization

**Frontend:**
- [ ] Code splitting
- [ ] Lazy loading components
- [ ] Image optimization
- [ ] Bundle size analysis
- [ ] Remove unused dependencies

**Backend:**
- [ ] Database query optimization
- [ ] Add pagination where needed
- [ ] Optimize indexes
- [ ] Add caching

**Testing:**
- [ ] Lighthouse audit
- [ ] Core Web Vitals
- [ ] Load testing

#### Day 3-4: UX Improvements

**UI/UX:**
- [ ] Consistent loading states
- [ ] Better error messages
- [ ] Responsive design review
- [ ] Accessibility audit (WCAG)
- [ ] Keyboard navigation
- [ ] Screen reader support

**Testing:**
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS, Android)
- [ ] Tablet testing

#### Day 5: Testing

**Test Coverage:**
- [ ] Unit tests (Vitest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
  - [ ] User registration flow
  - [ ] Login flow
  - [ ] Create document
  - [ ] Create table
  - [ ] Create schedule
  - [ ] Create event
  - [ ] AI features
- [ ] Test coverage report

#### Day 6: Documentation

**User Documentation:**
- [ ] Getting started guide
- [ ] Feature tutorials
- [ ] FAQ
- [ ] Video tutorials (optional)

**Developer Documentation:**
- [ ] README update
- [ ] Architecture documentation
- [ ] API documentation
- [ ] Contributing guide
- [ ] Deployment guide

#### Day 7: Deployment

**Pre-deployment:**
- [ ] Final code review
- [ ] Security audit
- [ ] Environment variables check
- [ ] Database backup
- [ ] Rollback plan

**Deployment:**
- [ ] Deploy to production (Vercel)
- [ ] Configure custom domain
- [ ] Setup SSL
- [ ] Configure Convex production
- [ ] Configure Clerk production
- [ ] Setup error tracking (Sentry)
- [ ] Setup analytics (optional)

**Post-deployment:**
- [ ] Smoke tests
- [ ] Monitor errors
- [ ] Monitor performance
- [ ] User feedback collection

---

## POST-LAUNCH: MAINTENANCE & ITERATION

### Week 1-2: Monitoring

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Monitor AI usage and costs
- [ ] Collect user feedback
- [ ] Fix critical bugs

### Week 3-4: Iteration

- [ ] Analyze user feedback
- [ ] Prioritize improvements
- [ ] Plan next sprint
- [ ] Implement quick wins

---

## METRICS & SUCCESS CRITERIA

### Technical Metrics
- [ ] Page load time < 3s
- [ ] API response time < 2s
- [ ] Error rate < 1%
- [ ] Uptime > 99.9%
- [ ] Lighthouse score > 90

### User Metrics
- [ ] User registration rate
- [ ] Daily Active Users (DAU)
- [ ] Feature adoption rates
- [ ] User retention (Week 1, Month 1)
- [ ] Net Promoter Score (NPS)

### Business Metrics
- [ ] AI usage within budget
- [ ] Infrastructure costs < $200/month
- [ ] Support ticket volume
- [ ] User satisfaction score

---

## RISK MANAGEMENT

### High Priority Risks

1. **AI API Costs**
   - Mitigation: Usage quotas, caching, rate limiting
   - Monitor: Daily cost tracking

2. **Performance with Large Datasets**
   - Mitigation: Pagination, virtualization, lazy loading
   - Monitor: Query performance metrics

3. **Convex Vendor Lock-in**
   - Mitigation: Abstract database layer
   - Plan: Migration strategy to PostgreSQL (if needed)

4. **User Adoption**
   - Mitigation: User testing, feedback loops
   - Plan: Marketing and onboarding improvements

---

## TEAM & RESOURCES

### Required Skills
- [ ] Next.js / React
- [ ] TypeScript
- [ ] Convex
- [ ] Clerk Auth
- [ ] AI/ML (Gemini API)
- [ ] UI/UX Design

### Estimated Effort
- **Solo Developer:** 8-10 tuần full-time
- **2 Developers:** 5-6 tuần
- **Team (3-4):** 3-4 tuần

---

## NOTES

### Dependencies
- Ensure all npm packages are compatible
- Test in development before production
- Keep dependencies updated

### Best Practices
- Write clean, documented code
- Follow TypeScript best practices
- Use ESLint and Prettier
- Write tests for critical paths
- Regular code reviews

### Communication
- Daily standups (if team)
- Weekly progress reports
- Regular stakeholder updates
- User feedback sessions

---

**Created:** 01/12/2025
**Version:** 1.0
**Status:** Ready for execution

# Responsive Design Implementation Plan

## Status: 🚧 In Progress

### 1. [✅] Create SidebarContext / Shared State
   - New file: components/SidebarContext.tsx ✅
   - Share isCollapsed, isMobileOpen, toggle functions across Navbar/Layout/Sidebar ✅

### 2. [ ] Update app/(dashboard)/layout.tsx
   - Hide sidebar on mobile: `hidden md:block md:w-72`
   - Add backdrop div (conditional on isMobileOpen)
   - Wrap with SidebarContext.Provider
   - Responsive header/navbar positioning

### 3. [ ] Update components/Sidebar.tsx
   - Responsive default: collapsed=true on mobile (< md)
   - Mobile overlay: `fixed inset-0 z-50 translate-x-full md:translate-x-0 md:static`
   - Adjust toggle button position/responsive
   - Backdrop click close

### 4. [ ] Update components/Navbar.tsx
   - Add hamburger button: `md:hidden` visible mobile
   - Use context to toggle isMobileOpen
   - Responsive positioning: `left-4 md:left-8`
   - Integrate notifications responsive

### 5. [ ] Update globals.css
   - Add custom responsive utilities (mobile-first containers, scrollbar-hide)
   - Ensure Tailwind full viewport support

### 6. [ ] Make Dashboard Pages Responsive
   - Tables: `overflow-x-auto`, mobile stack `flex-col sm:flex-row`
   - Cards/Grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
   - Priority: employees, biometric, attendance, inventory, payroll, vouchers
   - Forms: stacked mobile

### 7. [ ] Auth Pages Responsive
   - login/page.tsx: centered form, full-width mobile
   - Modals: full-screen mobile `h-screen max-h-screen md:max-h-[90vh]`

### 8. [ ] Test & Verify
   - Run `npm run dev`
   - Test viewports: 320px, 375px, 768px, 1024px, 1440px
   - Check all pages, sidebar toggle, no fetch breaks
   - Update this TODO with completion marks

**Notes:**
- Preserve all existing design/colors/RTL/fetch logic
- Mobile: Sidebar closed/icons-only, hamburger toggle, overlay
- All sizes: sm/md/lg/xl breakpoints

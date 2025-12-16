# 🚀 UniDoxia Performance Optimization Guide

This guide documents all performance optimizations implemented in UniDoxia to ensure blazing-fast user experience.

## 📊 Performance Targets

- ✅ Lighthouse Score: **90+**
- ✅ Time To Interactive (TTI): **< 2s**
- ✅ First Contentful Paint (FCP): **< 1s**
- ✅ Largest Contentful Paint (LCP): **< 2.5s**
- ✅ Cumulative Layout Shift (CLS): **< 0.1**
- ✅ First Input Delay (FID): **< 100ms**

## 🎯 Optimizations Implemented

### 1. Code Splitting & Lazy Loading ✅

**Routes are lazy-loaded:**
- All dashboard routes (Student, Admin, Agent, University, Staff)
- Auth pages (except Login - eagerly loaded for CTA)
- Heavy components (Charts, Editors, Modals)

**Below-the-fold components lazy-loaded:**
- Featured Universities Section
- Storyboard Section
- AI Features (Document Checker, Fee Calculator)
- Contact Forms

**Files:**
- `src/App.tsx` - Route-level code splitting
- `src/pages/Index.tsx` - Component-level lazy loading

### 2. CSS Performance 🎨

**CRITICAL FIX: Removed global transitions**
- Previously: ALL elements had transitions (major performance killer)
- Now: Only specific interactive elements have transitions
- Use utility classes: `.transition-smooth`, `.transition-quick`

**Animation best practices:**
- Only use `transform` and `opacity` for animations (GPU-accelerated)
- Avoid `box-shadow`, `width`, `height` animations
- Use `will-change` sparingly and only when needed

**Files:**
- `src/index.css` - Optimized CSS with removed global transitions

### 3. Video Optimization 🎥

**Hero video is highly optimized:**
- Deferred loading with `requestIdleCallback`
- Respects user preferences (reduced motion, data saver)
- Checks network conditions (no load on 2G/slow connections)
- Falls back to static image
- Uses `preload="metadata"` when loaded
- `playsInline` for mobile

**Files:**
- `src/pages/Index.tsx` (lines 51-82)

### 4. React Performance ⚛️

**Memoization:**
- Created `OptimizedCard` component with React.memo
- Created `OptimizedButton` component with React.memo
- Use `useMemo` for expensive computations
- Use `useCallback` for function props

**Custom hooks:**
- `useOptimizedQuery` - Optimized React Query hook with better defaults
- `useOptimizedPaginatedQuery` - For paginated data
- Query hooks include structural sharing and intelligent caching

**Files:**
- `src/components/optimized/OptimizedCard.tsx`
- `src/components/optimized/OptimizedButton.tsx`
- `src/hooks/useOptimizedQuery.ts`

### 5. Data Fetching Optimization 📡

**React Query Configuration:**
```typescript
{
  staleTime: 5 * 60 * 1000,      // Data fresh for 5 minutes
  gcTime: 10 * 60 * 1000,        // Keep in cache for 10 minutes
  refetchOnMount: false,         // Don't refetch if data is fresh
  refetchOnWindowFocus: false,   // Prevent unnecessary refetches
  structuralSharing: true,       // Optimize re-renders
  retry: 2,                      // Faster failure detection
}
```

**Supabase Optimizations:**
- Selective field fetching (only fetch what's needed)
- Batch queries where possible
- Use `.select('specific,fields')` instead of `.select('*')`
- Query builders for common patterns

**Files:**
- `src/App.tsx` - Query client configuration
- `src/lib/supabaseOptimizations.ts` - Supabase query helpers
- `src/lib/queryOptimizations.ts` - React Query utilities

### 6. Bundle Size Optimization 📦

**Vite Configuration:**
- Manual chunk splitting for optimal caching
- Vendor chunks: React, Radix UI, TanStack Query, Supabase
- Heavy libraries in separate chunks: Framer Motion, Recharts, TipTap
- Tree-shaking enabled
- CSS code splitting enabled
- Modern browser target (`esnext`)

**Icon Optimization:**
- Centralized icon exports in `src/lib/icons.ts`
- Only import used icons (tree-shaking works)
- Individual imports from `lucide-react`

**Files:**
- `vite.config.ts` - Build configuration
- `src/lib/icons.ts` - Centralized icon exports

### 7. Loading States & Skeletons 💀

**Replaced spinners with skeletons:**
- `DashboardSkeleton` - For dashboard pages
- `TableSkeleton` - For data tables
- `CardSkeleton` - For card grids
- `Skeleton` component - Base skeleton component

**Better UX:**
- Instant visual feedback
- Reduced perceived loading time
- Smooth content transitions

**Files:**
- `src/components/ui/skeleton.tsx`
- `src/components/skeletons/DashboardSkeleton.tsx`
- `src/components/skeletons/TableSkeleton.tsx`
- `src/components/skeletons/CardSkeleton.tsx`

### 8. Performance Monitoring 📈

**Development Tools:**
- Press `Ctrl/Cmd + Shift + P` to toggle performance monitor
- Shows Web Vitals in real-time (FCP, LCP, FID, CLS)
- Shows load metrics (TTFB, DOM Content Loaded, Load Complete)
- Color-coded scores (Green/Yellow/Red)

**Files:**
- `src/components/PerformanceMonitor.tsx`
- `src/lib/performance.ts` - Performance utilities

### 9. Image Optimization 🖼️

**Best Practices:**
- Use `loading="lazy"` for below-the-fold images
- Use `decoding="async"` for faster rendering
- Provide `width` and `height` to prevent CLS
- Use WebP format when possible
- Compress images before upload

**Utilities Available:**
- `generateSrcSet` - Responsive image sets
- `compressImage` - Client-side compression
- `lazyLoadImage` - Intersection Observer lazy loading
- `preloadImage` - Preload critical images

**Files:**
- `src/lib/imageOptimization.ts`

### 10. Network Optimization 🌐

**Prefetching:**
- Common routes prefetched on idle
- Network condition checks (no prefetch on slow connections)
- Respects data saver mode

**Caching:**
- localStorage caching utilities
- Cache with expiry
- Pattern-based cache clearing

**Files:**
- `src/App.tsx` - Prefetch logic
- `src/lib/performance.ts` - Network utilities
- `src/lib/queryOptimizations.ts` - Cache utilities

## 🛠️ How to Use

### Using Optimized Components

```tsx
import { OptimizedCard } from "@/components/optimized/OptimizedCard";
import { OptimizedButton } from "@/components/optimized/OptimizedButton";

// Card only re-renders when props actually change
<OptimizedCard
  title="Dashboard"
  content={<p>Content here</p>}
/>

// Button only re-renders when props actually change
<OptimizedButton onClick={handleClick}>
  Click Me
</OptimizedButton>
```

### Using Optimized Queries

```tsx
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";

// Automatically optimized with caching and performance enhancements
const { data, isLoading } = useOptimizedQuery(
  ["users", userId],
  () => fetchUser(userId)
);
```

### Using Supabase Optimizations

```tsx
import { selectFields, commonSelects } from "@/lib/supabaseOptimizations";

// Only fetch specific fields
const { data } = await supabase
  .from("profiles")
  .select(commonSelects.profile)
  .eq("id", userId)
  .single();
```

### Using Skeletons

```tsx
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Suspense } from "react";

<Suspense fallback={<DashboardSkeleton />}>
  <DashboardContent />
</Suspense>
```

## 📝 Performance Checklist

When adding new features, ensure:

- [ ] Components use React.memo when appropriate
- [ ] Expensive computations use useMemo
- [ ] Callback props use useCallback
- [ ] Images have loading="lazy" (except above-fold)
- [ ] Heavy components are lazy-loaded
- [ ] Queries use optimized hooks
- [ ] Only necessary fields are fetched from Supabase
- [ ] Skeletons are used instead of spinners
- [ ] No global CSS transitions on all elements
- [ ] Animations use transform/opacity only
- [ ] Icons imported individually (tree-shaking)

## 🔍 Testing Performance

### Development
```bash
npm run dev
# Press Ctrl/Cmd + Shift + P to see performance metrics
```

### Production Build
```bash
npm run build
npm run preview
```

### Lighthouse Audit
1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Run audit for "Performance"
4. Target: **90+ score**

### Bundle Analysis
```bash
npm run build
# Check dist/ folder sizes
# Ensure vendor chunks are properly split
```

## 🎓 Best Practices

### DO ✅
- Lazy load below-the-fold content
- Use skeletons for loading states
- Memoize components and callbacks
- Fetch only needed fields
- Use transform/opacity for animations
- Test on slow networks
- Monitor Web Vitals

### DON'T ❌
- Add transitions to all elements
- Use box-shadow/width animations
- Fetch all fields with `select('*')`
- Load heavy components eagerly
- Ignore network conditions
- Use spinners everywhere
- Skip performance testing

## 🚀 Future Improvements

Potential future optimizations:
1. Implement service worker for offline support
2. Add HTTP/2 server push
3. Implement resource hints (preconnect, dns-prefetch)
4. Add WebP/AVIF image support
5. Implement route-based preloading
6. Add virtual scrolling for long lists
7. Implement progressive image loading
8. Add compression (Brotli/Gzip) on server

## 📚 Resources

- [Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [TanStack Query](https://tanstack.com/query/latest/docs/react/guides/performance)
- [Supabase Performance](https://supabase.com/docs/guides/database/performance)

---

**Last Updated:** December 2025
**Maintained by:** UniDoxia Engineering Team

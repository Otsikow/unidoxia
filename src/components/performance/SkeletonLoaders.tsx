import { memo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Skeleton loaders for various components
 * Use these instead of spinners for perceived performance
 */

/** Base shimmer skeleton with animation */
export const ShimmerSkeleton = memo(function ShimmerSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-muted via-muted/70 to-muted bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  );
});

/** Skeleton for section headers */
export const SectionHeaderSkeleton = memo(function SectionHeaderSkeleton() {
  return (
    <div className="space-y-3 mb-8">
      <Skeleton className="h-8 w-64 mx-auto" />
      <Skeleton className="h-4 w-96 mx-auto max-w-full" />
    </div>
  );
});

/** Skeleton for feature cards */
export const FeatureCardSkeleton = memo(function FeatureCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="w-full h-48">
        <Skeleton className="w-full h-full" />
      </div>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
  );
});

/** Skeleton for CTA cards */
export const CTACardSkeleton = memo(function CTACardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-48 sm:h-56">
        <Skeleton className="w-full h-full" />
      </div>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
});

/** Skeleton for university cards */
export const UniversityCardSkeleton = memo(function UniversityCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );
});

/** Skeleton for testimonial cards */
export const TestimonialSkeleton = memo(function TestimonialSkeleton() {
  return (
    <Card className="max-w-3xl mx-auto border-2">
      <CardContent className="p-10 space-y-6">
        <Skeleton className="h-10 w-10 mx-auto rounded-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6 mx-auto" />
        <div className="flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-5" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </CardContent>
    </Card>
  );
});

/** Skeleton for dashboard stats */
export const DashboardStatsSkeleton = memo(function DashboardStatsSkeleton({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

/** Skeleton for table rows */
export const TableRowSkeleton = memo(function TableRowSkeleton({
  columns = 5,
}: {
  columns?: number;
}) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
});

/** Skeleton for data tables */
export const TableSkeleton = memo(function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-muted/50 p-4 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-t flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
});

/** Skeleton for form sections */
export const FormSkeleton = memo(function FormSkeleton({
  fields = 4,
}: {
  fields?: number;
}) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
});

/** Skeleton for chat messages */
export const ChatMessageSkeleton = memo(function ChatMessageSkeleton({
  count = 3,
}: {
  count?: number;
}) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("flex gap-3", i % 2 === 0 ? "justify-start" : "justify-end")}
        >
          {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
          <div className={cn("space-y-2", i % 2 === 0 ? "w-2/3" : "w-1/2")}>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
});

/** Skeleton for list items */
export const ListItemSkeleton = memo(function ListItemSkeleton({
  count = 5,
}: {
  count?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
});

/** Generic page skeleton */
export const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      <DashboardStatsSkeleton count={4} />

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          <TableSkeleton rows={5} columns={5} />
        </CardContent>
      </Card>
    </div>
  );
});

/** Landing section skeleton with minimal layout shift */
export const LandingSectionSkeleton = memo(function LandingSectionSkeleton({
  height = "py-20",
  className,
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", height, className)}>
      <div className="container mx-auto px-4">
        <SectionHeaderSkeleton />
        <div className="grid md:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <FeatureCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
});

export default {
  ShimmerSkeleton,
  SectionHeaderSkeleton,
  FeatureCardSkeleton,
  CTACardSkeleton,
  UniversityCardSkeleton,
  TestimonialSkeleton,
  DashboardStatsSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  FormSkeleton,
  ChatMessageSkeleton,
  ListItemSkeleton,
  PageSkeleton,
  LandingSectionSkeleton,
};

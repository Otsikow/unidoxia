import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TASK_VIEWS, parseTaskView, type TaskView } from '@/lib/taskViews';

export function TaskSummaryLink({ view, className, children }: {
  view: TaskView; className?: string; children: ReactNode;
}) {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set('taskView', view);
  for (const key of ['taskStatus', 'taskPriority', 'taskPage']) next.delete(key);
  return <Link
    to={{ search: `?${next}`, hash: '#task-list' }}
    aria-label={`View ${TASK_VIEWS[view].toLowerCase()}`}
    aria-current={parseTaskView(params.get('taskView')) === view ? 'true' : undefined}
    className={cn('block text-left transition-colors aria-[current=true]:border-primary/60 aria-[current=true]:bg-primary/5 hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}
  >{children}</Link>;
}

/** Shared names for task-summary drill-downs and the board filter. */
export const TASK_VIEWS = {
  all: 'All tasks',
  open: 'Open tasks',
  dueSoon: 'Due in next 3 days',
  overdue: 'Overdue tasks',
  completed: 'Completed tasks',
  automated: 'Auto-generated tasks',
  manual: 'Tasks logged by your team',
  noDueDate: 'Tasks with no due date',
  assigned: 'Assigned tasks',
} as const;
export type TaskView = keyof typeof TASK_VIEWS;
export const parseTaskView = (value: string | null | undefined): TaskView =>
  value && Object.prototype.hasOwnProperty.call(TASK_VIEWS, value) ? value as TaskView : 'all';

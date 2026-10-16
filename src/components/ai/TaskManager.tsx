import { useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckSquare, Filter, Flag, Plus, User } from "lucide-react";

import { useCreateTask, useStaffTasks, type StaffTaskItem } from "@/hooks/useStaffData";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Priority = "low" | "medium" | "high";

const priorityBadges: Record<Priority, string> = {
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
};

const statusBadges: Record<string, string> = {
  open: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  done: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
};

const initialTaskState = {
  title: "",
  description: "",
  priority: "medium" as Priority,
  dueDate: "",
};

export default function TaskManager() {
  const { toast } = useToast();
  const [page] = useState(1);
  const [newTask, setNewTask] = useState(initialTaskState);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const statusFilter = useMemo(() => {
    if (filterStatus === "todo") return "open";
    if (filterStatus === "completed") return "done";
    if (filterStatus === "all") return "all";
    return filterStatus;
  }, [filterStatus]);

  const priorityFilter = useMemo(() => {
    if (filterPriority === "all") return "all";
    return filterPriority as Priority;
  }, [filterPriority]);

  const {
    data: taskData,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useStaffTasks(page, {
    status: statusFilter,
    priority: priorityFilter,
  });

  const createTask = useCreateTask();
  const tasks = useMemo(() => (taskData?.data ?? []) as StaffTaskItem[], [taskData]);

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Add a task title",
        description: "Tasks need a title so your team can triage them.",
        variant: "destructive",
      });
      return;
    }

    createTask.mutate(
      {
        title: newTask.title.trim(),
        description: newTask.description.trim() || undefined,
        priority: newTask.priority,
        dueAt: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Task created",
            description: "Your task was saved and added to your to-do list.",
          });
          setNewTask(initialTaskState);
        },
        onError: (mutationError) => {
          const message =
            mutationError instanceof Error
              ? mutationError.message
              : "We couldn’t save that task. Please try again.";

          toast({
            title: "Unable to create task",
            description: message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const visibleTasks = useMemo(() => {
    if (filterStatus === "all" && filterPriority === "all") return tasks;
    return tasks.filter((task) => {
      const statusMatches =
        filterStatus === "all" ||
        (filterStatus === "todo" && (task.status ?? "open") === "open") ||
        (filterStatus === "completed" && (task.status ?? "open") === "done") ||
        (filterStatus !== "todo" && filterStatus !== "completed" && task.status === filterStatus);

      const priorityMatches = filterPriority === "all" || task.priority === filterPriority;
      return statusMatches && priorityMatches;
    });
  }, [tasks, filterPriority, filterStatus]);

  const renderEmptyState = () => {
    if (isLoading || isFetching) {
      return <p className="text-sm text-muted-foreground">Loading tasks…</p>;
    }

    if (isError) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message ?? "")
          : "We couldn’t load your tasks. Please try again.";

      return (
        <div className="rounded-md border border-dashed p-4 text-sm text-destructive">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" /> Unable to load tasks
          </div>
          <p className="mb-3 text-muted-foreground">{message}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No tasks found</p>
        <p className="mt-1">Create a task to see it appear here instantly.</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <CheckSquare className="h-6 w-6 text-primary" />
            Task Manager
          </h2>
          <p className="text-muted-foreground">Manage and track your tasks efficiently</p>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">All Tasks</TabsTrigger>
          <TabsTrigger value="create">Create Task</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {visibleTasks.length === 0
              ? renderEmptyState()
              : visibleTasks.map((task) => {
                  const priorityClass = priorityBadges[(task.priority ?? "medium") as Priority] ?? priorityBadges.medium;
                  const statusClass = statusBadges[task.status ?? "open"] ?? statusBadges.open;
                  const dueDisplay = task.dueAt
                    ? new Date(task.dueAt).toLocaleDateString('en-GB')
                    : task.createdAt
                      ? new Date(task.createdAt).toLocaleDateString('en-GB')
                      : "No due date";

                  return (
                    <Card key={task.id} className="transition-shadow hover:shadow-md">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-1 items-start gap-4">
                            <Checkbox checked={task.status === "done"} disabled className="mt-1" />
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">{task.title}</h3>
                                <Badge className={priorityClass}>Priority {task.priority ?? "medium"}</Badge>
                                <Badge className={statusClass}>{(task.status ?? "open").replace("_", " ")}</Badge>
                              </div>
                              {task.description ? (
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due: {dueDisplay}
                                </span>
                                {task.assigneeName ? (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {task.assigneeName}
                                  </span>
                                ) : null}
                                {task.applicationId ? (
                                  <span className="flex items-center gap-1">
                                    <Flag className="h-3 w-3" />
                                    Application #{task.applicationId.slice(0, 8)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Task
              </CardTitle>
              <CardDescription>Add a new task to your task list</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, dueDate: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value: Priority) => setNewTask((prev) => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateTask} className="w-full" disabled={createTask.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {createTask.isPending ? "Saving task…" : "Create Task"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

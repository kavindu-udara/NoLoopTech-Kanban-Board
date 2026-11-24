"use client";
import { SubmitEvent, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { CreateTaskInput, Task, TaskStatus } from "@/types";
import { createTask, getTasks, updateTaskStatus } from "@/api/tasks";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface TaskCardProps {
  task: Task;
  onMove: (taskId: string, newStatus: TaskStatus) => void;
}

function TaskCard({ task, onMove }: TaskCardProps) {
  return (
    <div className={styles.taskCard}>
      <h3 className={styles.taskTitle}>{task.title}</h3>
      {task.description && (
        <p className={styles.taskDesc}>{task.description}</p>
      )}
      {task.dueDate && <p className={styles.taskDue}>Due: {task.dueDate}</p>}

      <div className={styles.taskActions}>
        {task.status !== "TODO" && (
          <button
            className={styles.button}
            onClick={() => onMove(task.id, "TODO")}
            aria-label={`Move ${task.title} to To Do`}
          >
            To Do
          </button>
        )}
        {task.status !== "IN_PROGRESS" && (
          <button
            className={styles.button}
            onClick={() => onMove(task.id, "IN_PROGRESS")}
            aria-label={`Move ${task.title} to In Progress`}
          >
            In Progress
          </button>
        )}
        {task.status !== "DONE" && (
          <button
            className={styles.button}
            onClick={() => onMove(task.id, "DONE")}
            aria-label={`Move ${task.title} to Done`}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onMove: (taskId: string, newStatus: TaskStatus) => void;
}

function Column({ status, tasks, onMove }: ColumnProps) {
  const count = tasks.filter((t) => t.status === status).length;
  const columnTasks = tasks.filter((t) => t.status === status);

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <span className={styles.columnTitle}>{status.replace("_", " ")}</span>
        <span className={styles.count}>{count}</span>
      </div>

      {columnTasks.map((task) => (
        <TaskCard key={task.id} task={task} onMove={onMove} />
      ))}
    </div>
  );
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskError, setNewTaskError] = useState<string | null>(null);

  // debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // init data fetch
  useEffect(() => {
    async function fetchTasks() {
      try {
        const data = await getTasks();
        setTasks(data);
      } catch (error: any) {
        console.error("Failed to fetch tasks", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, []);

  // filter tasks based on debounced query
  const filteredTasks = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return tasks;

    return tasks.filter((task) =>
      task.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
    );
  }, [tasks, debouncedSearchQuery]);

  const handleMove = async (taskId: string, newStatus: TaskStatus) => {
    const originalTasks = [...tasks];

    // update the UI immediately
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
    setMoveError(null);

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (error: any) {
      setTasks(originalTasks);
      setMoveError(error.message || "Failed to move task. Please try again.");

      // auto clear err message after 4sec
      setTimeout(() => setMoveError(null), 4000);
    }
  };

  const handleAddTask = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedTitle = newTaskTitle.trim();

    // client side match api rules
    if (!trimmedTitle) {
      setNewTaskError("Title is required.");
      return;
    }

    if (trimmedTitle.length > 80) {
      setNewTaskError("Title must be at most 80 characters.");
      return;
    }

    setNewTaskError(null);

    const input: CreateTaskInput = { title: trimmedTitle, status: "TODO" };

    try {
      const createdTask = await createTask(input);
      setTasks((prev) => [...prev, createdTask]);
      setNewTaskTitle("");
      setIsAddingTask(false);
    } catch (error: any) {
      setNewTaskError(error.message || "Failed to create task.");
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Task Board</h1>
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Task Board</h1>
      {moveError && (
        <div className={styles.errorBanner} role="alert" aria-live="polite">
          {moveError}
        </div>
      )}

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search tasks by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          aria-label="Search tasks by title"
        />
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={() => setIsAddingTask(true)}
        >
          + Add Task
        </button>
      </div>

      {isAddingTask && (
        <form onSubmit={handleAddTask} className={styles.addForm}>
          <div className={styles.formGroup}>
            <label htmlFor="new-task-title" className={styles.label}>
              Task Title
            </label>
            <input
              id="new-task-title"
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className={styles.input}
              maxLength={80}
              autoFocus
              aria-required="true"
              aria-invalid={!!newTaskError}
              aria-describedby={newTaskError ? "title-error" : undefined}
            />
            {newTaskError && (
              <span id="title-error" className={styles.errorText} role="alert">
                {newTaskError}
              </span>
            )}
          </div>
          <div className={styles.formActions}>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Create Task
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskError(null);
                setNewTaskTitle("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={styles.board}>
        {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((status) => (
          <Column
            key={status}
            status={status}
            tasks={filteredTasks}
            onMove={handleMove}
          />
        ))}
      </div>
    </div>
  );
}

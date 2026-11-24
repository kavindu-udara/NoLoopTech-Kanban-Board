"use client";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { Task, TaskStatus } from "@/types";
import { getTasks, updateTaskStatus } from "@/api/tasks";

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
      <div className={styles.board}>
        {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((status) => (
          <Column
            key={status}
            status={status}
            tasks={tasks}
            onMove={handleMove}
          />
        ))}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function KanbanBoard() {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Task Board</h1>
        <p>Loading tasks...</p>
      </div>
    );
  }
}

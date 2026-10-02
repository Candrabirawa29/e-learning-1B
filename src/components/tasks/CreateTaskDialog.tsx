"use client";

import { TaskFormDialog } from "./TaskFormDialog";
import { MemberOption } from "./MemberSelector";
import * as React from "react";

interface CreateTaskDialogProps {
  courses: { id: string; name: string; code?: string | null }[];
  members: MemberOption[];
  triggerButton?: React.ReactNode;
}

export function CreateTaskDialog({ courses, members, triggerButton }: CreateTaskDialogProps) {
  return (
    <TaskFormDialog
      mode="create"
      courses={courses}
      members={members}
      triggerButton={triggerButton}
    />
  );
}

export { TaskFormDialog };

"use client";

import * as React from "react";
import { FocusTimerDisplay } from "@/components/focus/FocusTimerDisplay";
import { FocusSessionConfigDialog } from "@/components/focus/FocusSessionConfigDialog";
import { FocusPreferenceDialog } from "@/components/focus/FocusPreferenceDialog";
import { FocusCompleteModal } from "@/components/focus/FocusCompleteModal";
import { FocusHistoryTable } from "@/components/focus/FocusHistoryTable";
import { Button } from "@/components/ui/button";
import { Settings2, BarChart2 } from "lucide-react";
import Link from "next/link";

interface CourseOption {
  id: string;
  name: string;
  code: string | null;
}

interface TaskOption {
  id: string;
  title: string;
  courseId: string | null;
}

interface FocusRoomClientProps {
  courses: CourseOption[];
  tasks: TaskOption[];
}

export function FocusRoomClient({ courses, tasks }: FocusRoomClientProps) {
  const [configOpen, setConfigOpen] = React.useState<boolean>(false);
  const [prefOpen, setPrefOpen] = React.useState<boolean>(false);
  const [completeOpen, setCompleteOpen] = React.useState<boolean>(false);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <Link href="/home/study-analytics">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Lihat Analitik</span>
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPrefOpen(true)}
          className="h-8 text-xs gap-1.5"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>Pengaturan Target</span>
        </Button>
      </div>

      {/* Main Focus Timer Display */}
      <FocusTimerDisplay
        onOpenConfig={() => setConfigOpen(true)}
        onOpenCompleteModal={() => setCompleteOpen(true)}
      />

      {/* History Table */}
      <FocusHistoryTable courses={courses} />

      {/* Dialogs */}
      <FocusSessionConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        courses={courses}
        tasks={tasks}
      />

      <FocusPreferenceDialog
        open={prefOpen}
        onOpenChange={setPrefOpen}
      />

      <FocusCompleteModal
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      />
    </div>
  );
}

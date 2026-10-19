"use client";

import * as React from "react";
import { FocusTimerDisplay } from "@/components/focus/FocusTimerDisplay";
import { FocusPreferenceDialog } from "@/components/focus/FocusPreferenceDialog";
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
  const [prefOpen, setPrefOpen] = React.useState<boolean>(false);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <Link href="/home/study-analytics">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 cursor-pointer">
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Lihat Analitik</span>
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPrefOpen(true)}
          className="h-8 text-xs gap-1.5 cursor-pointer"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>Pengaturan Target</span>
        </Button>
      </div>

      {/* Main Focus Timer Display with interactive context chips */}
      <FocusTimerDisplay courses={courses} tasks={tasks} />

      {/* History Table */}
      <FocusHistoryTable courses={courses} tasks={tasks} />

      {/* Preferences Dialog */}
      <FocusPreferenceDialog
        open={prefOpen}
        onOpenChange={setPrefOpen}
      />
    </div>
  );
}

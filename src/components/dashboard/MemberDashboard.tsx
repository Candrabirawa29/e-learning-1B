"use client";

import Link from "next/link";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateTimeIndo, formatRelativeDeadline } from "@/lib/date";
import { MyTaskStatusDonut } from "./MyTaskStatusDonut";
import { DeadlineLoadBarChart } from "./DeadlineLoadBarChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatus } from "@prisma/client";
import {
  ListTodo,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Megaphone,
} from "lucide-react";

export interface MemberTaskProgress {
  profileId: string;
  status: TaskStatus;
  progress: number;
}

export interface MemberTaskAssignment {
  profileId: string;
}

export interface MemberTaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  deadline: Date | string | null;
  targetType: string;
  submissionUrl?: string | null;
  course: { name: string } | null;
  assignments: MemberTaskAssignment[];
  progresses: MemberTaskProgress[];
}

export interface MemberMaterialItem {
  id: string;
  title: string;
  materialType: string;
  course: { name: string };
}

export interface MemberAnnouncementItem {
  id: string;
  title: string;
  content: string;
  publishedAt: Date | string;
}

interface MemberDashboardProps {
  session: CurrentUserSession;
  tasks: MemberTaskItem[];
  materials: MemberMaterialItem[];
  announcements: MemberAnnouncementItem[];
  deadlineWeeksData: { week: string; label: string; count: number }[];
}

export function MemberDashboard({
  session,
  tasks,
  materials,
  announcements,
  deadlineWeeksData,
}: MemberDashboardProps) {
  const profileId = session.profile?.id;

  // Filter My Tasks (ditujukan ke ALL atau assigned ke user)
  const myTasks = tasks.filter((t) => {
    if (t.targetType === "ALL") return true;
    return t.assignments.some((a: MemberTaskAssignment) => a.profileId === profileId);
  });

  // Hitung status personal (no row = TODO)
  let todoCount = 0;
  let inProgressCount = 0;
  let reviewCount = 0;
  let doneCount = 0;

  for (const t of myTasks) {
    const prog = t.progresses.find((p) => p.profileId === profileId);
    const st = prog ? prog.status : TaskStatus.TODO;
    if (st === TaskStatus.DONE) doneCount++;
    else if (st === TaskStatus.IN_PROGRESS) inProgressCount++;
    else if (st === TaskStatus.REVIEW) reviewCount++;
    else todoCount++;
  }

  const completionRate =
    myTasks.length > 0 ? Math.round((doneCount / myTasks.length) * 100) : 0;

  // Due Soon & Overdue Tasks
  const dueSoonTasks = myTasks
    .filter((t) => {
      if (!t.deadline) return false;
      const prog = t.progresses.find((p) => p.profileId === profileId);
      const isDone = prog ? prog.status === TaskStatus.DONE : false;
      if (isDone) return false;
      const info = formatRelativeDeadline(t.deadline);
      return !info.isOverdue && info.isUrgent;
    })
    .slice(0, 4);

  const overdueTasks = myTasks
    .filter((t) => {
      if (!t.deadline) return false;
      const prog = t.progresses.find((p) => p.profileId === profileId);
      const isDone = prog ? prog.status === TaskStatus.DONE : false;
      if (isDone) return false;
      const info = formatRelativeDeadline(t.deadline);
      return info.isOverdue;
    })
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header Welcome Card */}
      <div className="border rounded-lg p-5 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold uppercase">
              {session.effectiveRole}
            </Badge>
            <span className="text-xs text-muted-foreground">Kelas 1-B</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1">
            Halo, {session.profile?.name || session.profile?.email.split("@")[0]}!
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Berikut ringkasan tugas dan agenda perkuliahan aktif Anda hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/home/tasks?scope=mine">
            <Button size="sm" className="h-8 text-xs font-medium gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              Buka Tugas Saya
            </Button>
          </Link>
          <Link href="/home/materials">
            <Button size="sm" variant="outline" className="h-8 text-xs font-medium gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Katalog Materi
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Tugasku</span>
            <ListTodo className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{myTasks.length}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Tugas aktif terdaftar
          </div>
        </Card>

        <Card className="p-3.5 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Tugas Selesai</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{doneCount}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            {completionRate}% terselesaikan
          </div>
        </Card>

        <Card className="p-3.5 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Sedang Dikerjakan</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{inProgressCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Dalam proses pengerjaan
          </div>
        </Card>

        <Card className="p-3.5 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Materi Kuliah</span>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{materials.length}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Tersedia untuk dipelajari
          </div>
        </Card>
      </div>

      {/* Charts Section: Donut (Status Tugasku) & Bar (Beban Deadline 4 Minggu) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MyTaskStatusDonut
          data={{
            todo: todoCount,
            inProgress: inProgressCount,
            review: reviewCount,
            done: doneCount,
          }}
        />

        <DeadlineLoadBarChart data={deadlineWeeksData} />
      </div>

      {/* Peringatan Deadline Mendekat & Terlambat */}
      {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueTasks.length > 0 && (
            <Card className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Perlu Perhatian: Tugas Melewati Batas Waktu</span>
                </div>
                <div className="space-y-2">
                  {overdueTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 bg-background border rounded text-xs"
                    >
                      <div className="space-y-0.5">
                        <Link
                          href="/home/tasks?scope=mine"
                          className="font-medium hover:underline line-clamp-1"
                        >
                          {t.title}
                        </Link>
                        <span className="text-[10px] text-muted-foreground">
                          {t.course?.name || "Umum"}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 shrink-0">
                        {formatRelativeDeadline(t.deadline).text}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {dueSoonTasks.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Segera Kumpulkan: Tenggat Waktu &lt; 3 Hari</span>
                </div>
                <div className="space-y-2">
                  {dueSoonTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 bg-background border rounded text-xs"
                    >
                      <div className="space-y-0.5">
                        <Link
                          href="/home/tasks?scope=mine"
                          className="font-medium hover:underline line-clamp-1"
                        >
                          {t.title}
                        </Link>
                        <span className="text-[10px] text-muted-foreground">
                          {t.course?.name || "Umum"}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                        {formatRelativeDeadline(t.deadline).text}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pengumuman Terkini */}
      {announcements.length > 0 && (
        <Card className="border bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-xs text-foreground">Pengumuman Kelas Terkini</h3>
              </div>
              <Link
                href="/home/announcements"
                className="text-xs text-primary hover:underline font-medium"
              >
                Lihat Semua
              </Link>
            </div>

            <div className="space-y-2">
              {announcements.slice(0, 2).map((a) => (
                <div key={a.id} className="p-3 rounded-md bg-muted/30 border text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{a.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDateTimeIndo(a.publishedAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {a.content}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

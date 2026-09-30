import Link from "next/link";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateIndo, formatDateTimeIndo, formatRelativeDeadline } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TaskStatus } from "@prisma/client";
import {
  ListTodo,
  Clock,
  ArrowRight,
  BookOpen,
  FileCheck2,
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
  course: { name: string } | null;
  assignments: MemberTaskAssignment[];
  progresses: MemberTaskProgress[];
}

export interface MemberAssignmentItem {
  id: string;
  title: string;
  deadline: Date | string;
  course: { name: string };
  submissions: Array<{ profileId: string }>;
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
  assignments: MemberAssignmentItem[];
  materials: MemberMaterialItem[];
  announcements: MemberAnnouncementItem[];
}

export function MemberDashboard({
  session,
  tasks,
  assignments,
  materials,
  announcements,
}: MemberDashboardProps) {
  const profileId = session.profile?.id;

  // Filter My Tasks (ditujukan ke ALL atau assigned ke user)
  const myTasks = tasks.filter((t) => {
    if (t.targetType === "ALL") return true;
    return t.assignments.some((a: MemberTaskAssignment) => a.profileId === profileId);
  });

  // Hitung progress
  const doneTasks = myTasks.filter((t) => {
    const prog = t.progresses.find((p: MemberTaskProgress) => p.profileId === profileId);
    return prog ? prog.status === TaskStatus.DONE : t.status === TaskStatus.DONE;
  });

  const inProgressTasks = myTasks.filter((t) => {
    const prog = t.progresses.find((p: MemberTaskProgress) => p.profileId === profileId);
    return prog ? prog.status === TaskStatus.IN_PROGRESS : t.status === TaskStatus.IN_PROGRESS;
  });

  const todoTasks = myTasks.filter((t) => {
    const prog = t.progresses.find((p: MemberTaskProgress) => p.profileId === profileId);
    return prog ? prog.status === TaskStatus.TODO : t.status === TaskStatus.TODO;
  });

  const completionRate =
    myTasks.length > 0 ? Math.round((doneTasks.length / myTasks.length) * 100) : 0;

  // Due Soon & Overdue Tasks
  const dueSoonTasks = myTasks
    .filter((t) => {
      if (!t.deadline) return false;
      const prog = t.progresses.find((p: MemberTaskProgress) => p.profileId === profileId);
      const isDone = prog ? prog.status === TaskStatus.DONE : t.status === TaskStatus.DONE;
      if (isDone) return false;
      const info = formatRelativeDeadline(t.deadline);
      return !info.isOverdue && info.isUrgent;
    })
    .slice(0, 4);

  const overdueTasks = myTasks
    .filter((t) => {
      if (!t.deadline) return false;
      const prog = t.progresses.find((p: MemberTaskProgress) => p.profileId === profileId);
      const isDone = prog ? prog.status === TaskStatus.DONE : t.status === TaskStatus.DONE;
      if (isDone) return false;
      const info = formatRelativeDeadline(t.deadline);
      return info.isOverdue;
    })
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header Welcome Card */}
      <div className="border rounded-lg p-5 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          <Link href="/home/my-tasks">
            <Button size="sm" className="h-8 text-xs font-medium gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              Buka Tugas Saya
            </Button>
          </Link>
          <Link href="/home/materials">
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Materi Kuliah
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card">
          <CardContent className="p-3.5 space-y-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Total Tugas Saya</span>
            <div className="text-xl font-bold text-foreground">{myTasks.length}</div>
            <div className="text-[10px] text-muted-foreground">Tugas kelas & individu</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3.5 space-y-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Perlu Dikerjakan</span>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {todoTasks.length + inProgressTasks.length}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {inProgressTasks.length} sedang dikerjakan
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3.5 space-y-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Tugas Selesai</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {doneTasks.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Terselesaikan</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Penyelesaian</span>
              <span className="font-bold text-xs">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            <div className="text-[10px] text-muted-foreground">Tingkat capaian pengerjaan</div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Warning Alert if any */}
      {overdueTasks.length > 0 && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>Perhatian: Ada {overdueTasks.length} tugas yang telah melewati batas waktu!</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {overdueTasks.map((task: MemberTaskItem) => (
              <div key={task.id} className="p-2 bg-background/80 rounded border flex items-center justify-between">
                <span className="font-medium truncate max-w-[200px]">{task.title}</span>
                <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold shrink-0">
                  {formatRelativeDeadline(task.deadline).text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Due Soon Tasks & Upcoming Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tasks Due Soon */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Tugas Mendekati Batas Waktu</h2>
            </div>
            <Link href="/home/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
              Semua Tugas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="border rounded-lg bg-card divide-y">
            {dueSoonTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Bagus! Tidak ada tugas mendesak yang mendekati batas waktu dalam 3 hari ke depan.
              </div>
            ) : (
              dueSoonTasks.map((task: MemberTaskItem) => {
                const deadline = formatRelativeDeadline(task.deadline);
                return (
                  <div key={task.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{task.title}</span>
                        {task.course && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-4 shrink-0">
                            {task.course.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>Deadline: {formatDateTimeIndo(task.deadline)}</span>
                        <span>•</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {deadline.text}
                        </span>
                      </div>
                    </div>

                    <Link href={`/home/my-tasks`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Buka Tugas
                      </Button>
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          {/* Upcoming Assignments */}
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Penugasan & Praktikum</h2>
              </div>
              <Link href="/home/assignments" className="text-xs text-primary hover:underline flex items-center gap-1">
                Semua Penugasan <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {assignments.length === 0 ? (
                <div className="p-6 text-center border rounded-lg bg-card text-xs text-muted-foreground">
                  Tidak ada penugasan atau praktikum aktif saat ini.
                </div>
              ) : (
                assignments.slice(0, 3).map((asg: MemberAssignmentItem) => {
                  const sub = asg.submissions.find((s) => s.profileId === profileId);
                  const deadline = formatRelativeDeadline(asg.deadline);

                  return (
                    <Card key={asg.id} className="bg-card">
                      <CardContent className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs leading-snug truncate">
                              {asg.title}
                            </span>
                            <Badge variant="secondary" className="text-[10px] py-0 h-4 shrink-0">
                              {asg.course.name}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>Deadline: {formatDateIndo(asg.deadline)}</span>
                            <span>•</span>
                            <span className={deadline.isOverdue ? "text-red-500 font-medium" : ""}>
                              {deadline.text}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {sub ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Terkumpul
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              Belum Dikumpulkan
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Announcements & Recent Materials */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Pengumuman Kelas</h2>
            </div>
            <Link href="/home/announcements" className="text-xs text-primary hover:underline flex items-center gap-1">
              Lihat Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {announcements.length === 0 ? (
              <div className="p-6 text-center border rounded-lg bg-card text-xs text-muted-foreground">
                Tidak ada pengumuman terbaru.
              </div>
            ) : (
              announcements.slice(0, 3).map((ann: MemberAnnouncementItem) => (
                <Card key={ann.id} className="bg-card">
                  <CardContent className="p-3.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs truncate max-w-[200px]">{ann.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDateIndo(ann.publishedAt)}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                      {ann.content}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Materi Terkini */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Materi Kuliah Baru</h2>
              </div>
              <Link href="/home/materials" className="text-xs text-primary hover:underline flex items-center gap-1">
                Katalog <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {materials.slice(0, 3).map((m: MemberMaterialItem) => (
                <div key={m.id} className="p-2.5 rounded border bg-card text-xs space-y-0.5">
                  <div className="font-medium text-xs truncate">{m.title}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>{m.course.name}</span>
                    <span className="uppercase text-[10px] font-semibold">{m.materialType}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

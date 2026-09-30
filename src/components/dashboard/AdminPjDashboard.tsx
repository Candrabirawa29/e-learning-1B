import Link from "next/link";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateIndo, formatDateTimeIndo } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckSquare,
  Users,
  BookOpen,
  FileCheck2,
  Megaphone,
  Plus,
  ArrowRight,
  Activity,
} from "lucide-react";

export interface AdminDashboardTaskItem {
  id: string;
  title: string;
  targetType: string;
  priority: string;
  course: { name: string } | null;
  progresses: Array<{ status: string }>;
}

export interface AdminDashboardAssignmentItem {
  id: string;
  title: string;
  deadline: Date | string;
  course: { name: string };
  submissions: Array<{ id: string }>;
}

export interface AdminDashboardActivityItem {
  id: string;
  action: string;
  createdAt: Date | string;
  metadata?: string | null;
  actor: {
    name: string | null;
    email: string;
  } | null;
}

interface AdminPjDashboardProps {
  session: CurrentUserSession;
  stats: {
    totalMembers: number;
    totalTasks: number;
    totalMaterials: number;
    totalAssignments: number;
    totalAnnouncements: number;
  };
  tasks: AdminDashboardTaskItem[];
  assignments: AdminDashboardAssignmentItem[];
  recentActivities: AdminDashboardActivityItem[];
}

export function AdminPjDashboard({
  session,
  stats,
  tasks,
  assignments,
  recentActivities,
}: AdminPjDashboardProps) {
  const isAdmin = session.effectiveRole === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border rounded-lg p-5 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold uppercase ${
                isAdmin
                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300"
              }`}
            >
              {session.effectiveRole} DASHBOARD
            </Badge>
            <span className="text-xs text-muted-foreground">Kelas 1-B Management</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1">
            {isAdmin ? "Panel Administrasi Kelas 1-B" : "Workspace Manajemen Pengurus (PJ)"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola penugasan, distribusi materi akademik, pengumuman resmi, dan pantau aktivitas kelas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/home/manage/tasks">
            <Button size="sm" className="h-8 text-xs font-medium gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Kelola Tugas
            </Button>
          </Link>
          <Link href="/home/manage/materials">
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Kelola Materi
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/home/manage/members">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Anggota Kelas
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-card">
          <CardContent className="p-3.5 space-y-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Mahasiswa
            </span>
            <div className="text-xl font-bold">{stats.totalMembers}</div>
            <div className="text-[10px] text-muted-foreground">Total Anggota 1-B</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3.5 space-y-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              Tugas Aktif
            </span>
            <div className="text-xl font-bold">{stats.totalTasks}</div>
            <div className="text-[10px] text-muted-foreground">Tugas kelas terdata</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3.5 space-y-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Materi
            </span>
            <div className="text-xl font-bold">{stats.totalMaterials}</div>
            <div className="text-[10px] text-muted-foreground">Dokumen & tautan</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3.5 space-y-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <FileCheck2 className="h-3.5 w-3.5" />
              Penugasan
            </span>
            <div className="text-xl font-bold">{stats.totalAssignments}</div>
            <div className="text-[10px] text-muted-foreground">Tugas praktikum</div>
          </CardContent>
        </Card>

        <Card className="bg-card col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 space-y-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Megaphone className="h-3.5 w-3.5" />
              Pengumuman
            </span>
            <div className="text-xl font-bold">{stats.totalAnnouncements}</div>
            <div className="text-[10px] text-muted-foreground">Pengumuman terbit</div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Tasks Overview & Recent Activity Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Class Tasks Status */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Status Tugas Kelas 1-B Terkini</h2>
            </div>
            <Link
              href="/home/manage/tasks"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Kelola Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="border rounded-lg bg-card divide-y">
            {tasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Belum ada tugas yang dibuat untuk kelas ini.
              </div>
            ) : (
              tasks.slice(0, 5).map((task: AdminDashboardTaskItem) => {
                const totalProg = task.progresses.length;
                const doneProg = task.progresses.filter((p) => p.status === "DONE").length;

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
                        <span>Target: {task.targetType === "ALL" ? "Semua Mahasiswa" : "Spesifik"}</span>
                        <span>•</span>
                        <span>{doneProg} dari {totalProg || stats.totalMembers} mahasiswa selesai</span>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] uppercase font-semibold shrink-0">
                      {task.priority}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>

          {/* Pending Submissions / Assignments summary */}
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Pengumpulan Penugasan Mahasiswa</h2>
              </div>
              <Link
                href="/home/manage/assignments"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Kelola Penugasan <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {assignments.length === 0 ? (
                <div className="p-6 text-center border rounded-lg bg-card text-xs text-muted-foreground">
                  Belum ada penugasan praktikum yang dibuat.
                </div>
              ) : (
                assignments.slice(0, 3).map((asg: AdminDashboardAssignmentItem) => (
                  <Card key={asg.id} className="bg-card">
                    <CardContent className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-semibold text-xs truncate">{asg.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {asg.course.name} • Batas: {formatDateIndo(asg.deadline)}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-xs text-foreground">
                          {asg.submissions.length} / {stats.totalMembers}
                        </span>
                        <div className="text-[10px] text-muted-foreground">Mahasiswa Submit</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity Audit Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Aktivitas Terkini (Audit)</h2>
            </div>
            {isAdmin && (
              <Link
                href="/home/manage/audit"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Semua Log <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          <div className="border rounded-lg bg-card divide-y text-xs">
            {recentActivities.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Belum ada catatan aktivitas di log audit.
              </div>
            ) : (
              recentActivities.slice(0, 8).map((log: AdminDashboardActivityItem) => (
                <div key={log.id} className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] uppercase font-semibold px-1 py-0">
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTimeIndo(log.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/90 font-medium">
                    {log.actor?.name || log.actor?.email || "Sistem"}
                  </div>
                  {log.metadata && (
                    <div className="text-[11px] text-muted-foreground truncate font-mono">
                      {log.metadata}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

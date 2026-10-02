"use client";

import Link from "next/link";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateTimeIndo } from "@/lib/date";
import { MyTaskStatusDonut } from "./MyTaskStatusDonut";
import { TaskProgressStackedBar, ActiveTaskProgressData } from "./TaskProgressStackedBar";
import { TasksWeeklyAreaChart, WeeklyActivityPoint } from "./TasksWeeklyAreaChart";
import { ActivationProgressCard } from "./ActivationProgressCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckSquare,
  Users,
  BookOpen,
  Megaphone,
  Plus,
  Activity,
  ListTodo,
} from "lucide-react";

export interface AdminDashboardActivityItem {
  id: string;
  action: string;
  createdAt: Date | string;
  metadata?: unknown;
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
    totalAnnouncements: number;
    activatedMembers: number;
  };
  myTaskStats: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
  activeTaskProgressData: ActiveTaskProgressData[];
  weeklyActivityData: WeeklyActivityPoint[];
  recentActivities: AdminDashboardActivityItem[];
}

export function AdminPjDashboard({
  session,
  stats,
  myTaskStats,
  activeTaskProgressData,
  weeklyActivityData,
  recentActivities,
}: AdminPjDashboardProps) {
  const isAdmin = session.effectiveRole === "ADMIN";

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
            Dashboard {isAdmin ? "Administrator" : "Penanggung Jawab (PJ)"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola aktivitas akademik, kurikulum, dan pantau progres pengerjaan mahasiswa aktif.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/home/tasks">
            <Button size="sm" className="h-8 text-xs font-medium gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Kelola Tugas
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

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Mahasiswa Terdaftar</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{stats.totalMembers}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Anggota aktif Kelas 1-B
          </div>
        </Card>

        <Card className="p-3.5 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Tugas</span>
            <CheckSquare className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{stats.totalTasks}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Tugas akademik aktif
          </div>
        </Card>

        <Card className="p-3.5 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Materi Pembelajaran</span>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{stats.totalMaterials}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Modul & referensi diunggah
          </div>
        </Card>

        <Card className="p-3.5 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Pengumuman</span>
            <Megaphone className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{stats.totalAnnouncements}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Siaran informasi kelas
          </div>
        </Card>
      </div>

      {/* Admin: Progres Aktivasi Akun Mahasiswa */}
      {isAdmin && (
        <ActivationProgressCard
          activatedCount={stats.activatedMembers}
          totalMembers={stats.totalMembers}
        />
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut Chart: Status tugasku (all roles) */}
        <MyTaskStatusDonut data={myTaskStats} />

        {/* Admin: Area chart (Tasks Created vs Completed per Week) */}
        {isAdmin ? (
          <TasksWeeklyAreaChart data={weeklyActivityData} />
        ) : (
          <div className="p-6 border rounded-lg bg-card flex flex-col justify-center text-xs text-muted-foreground space-y-2">
            <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <ListTodo className="h-4 w-4 text-primary" />
              Akses Penanggung Jawab (PJ)
            </span>
            <p>
              Sebagai PJ, Anda memiliki hak penuh mengelola materi, sub-topik, dan tugas pada mata kuliah yang
              telah ditugaskan kepada Anda. Anda juga menerima seluruh penugasan kelas di Kanban personal Anda.
            </p>
          </div>
        )}
      </div>

      {/* Stacked Horizontal Bar: Progress per active task (PJ: course tasks, Admin: all active tasks) */}
      <TaskProgressStackedBar
        data={activeTaskProgressData}
        title={isAdmin ? "Progres per Tugas Aktif (Seluruh Kelas)" : "Progres per Tugas Aktif (Mata Kuliah Saya)"}
        description="Persentase penyelesaian mahasiswa aktif (dihitung dari akun yang telah diaktivasi)."
      />

      {/* Aktivitas Terkini (Hanya Admin) */}
      {isAdmin && recentActivities.length > 0 && (
        <Card className="border bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-xs text-foreground">Log Aktivitas Terbaru</h3>
              </div>
              <Link
                href="/home/manage/audit"
                className="text-xs text-primary hover:underline font-medium"
              >
                Lihat Log Lengkap
              </Link>
            </div>

            <div className="divide-y text-xs">
              {recentActivities.map((act) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground">
                      {act.actor?.name || act.actor?.email.split("@")[0] || "Sistem"}
                    </span>
                    <span className="text-muted-foreground ml-1.5 text-[11px]">
                      {act.action.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {formatDateTimeIndo(act.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

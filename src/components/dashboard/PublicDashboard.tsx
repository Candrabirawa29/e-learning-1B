import Link from "next/link";
import { formatDateIndo, formatDateTimeIndo, formatRelativeDeadline } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Megaphone,
  Clock,
  ArrowRight,
  Pin,
} from "lucide-react";

export interface PublicTaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: Date | string | null;
  targetType: string;
  course: { name: string } | null;
}

export interface PublicMaterialItem {
  id: string;
  title: string;
  materialType: string;
  createdAt: Date | string;
  course: { name: string };
  topic: { title: string } | null;
}

export interface PublicAnnouncementItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: Date | string;
}

export interface PublicCourseItem {
  id: string;
  name: string;
  code: string | null;
  lecturer: string | null;
}

interface PublicDashboardProps {
  tasks: PublicTaskItem[];
  materials: PublicMaterialItem[];
  announcements: PublicAnnouncementItem[];
  courses: PublicCourseItem[];
}

export function PublicDashboard({ tasks, materials, announcements, courses }: PublicDashboardProps) {
  const upcomingDeadlines = tasks
    .filter((t): t is PublicTaskItem & { deadline: Date | string } => Boolean(t.deadline))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  const pinnedAnnouncement = announcements.find((a) => a.isPinned);
  const recentAnnouncements = announcements.slice(0, 3);
  const recentMaterials = materials.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="border rounded-lg p-5 bg-card relative overflow-hidden">
        <div className="max-w-2xl space-y-2">
          <Badge variant="outline" className="text-[11px] font-medium tracking-wide">
            PORTAL KELAS 1-B
          </Badge>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Selamat Datang di Workspace Akademik Kelas 1-B
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Platform terpadu pemantauan tugas kelas, arsip materi bersama, jadwal penugasan, dan pengumuman resmi perkuliahan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-4">
          <Link href="/login">
            <Button size="sm" className="h-8 text-xs font-medium">
              Masuk Mahasiswa
            </Button>
          </Link>
          <Link href="/tasks">
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
              Lihat Daftar Tugas
            </Button>
          </Link>
          <Link href="/materials">
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
              Materi Terbuka
            </Button>
          </Link>
        </div>
      </div>

      {/* Pinned Announcement */}
      {pinnedAnnouncement && (
        <Card className="border-amber-400/60 dark:border-amber-600/40 bg-amber-50/20 dark:bg-amber-950/10">
          <CardContent className="p-4 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <Pin className="h-3.5 w-3.5 fill-current" />
                <span>Pengumuman Utama: {pinnedAnnouncement.title}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {formatDateIndo(pinnedAnnouncement.publishedAt)}
              </span>
            </div>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed text-xs">
              {pinnedAnnouncement.content}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Upcoming Deadlines & Recent Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upcoming Tasks / Deadlines */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Batas Waktu Terdekat (Deadlines)</h2>
            </div>
            <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
              Semua Tugas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="border rounded-lg bg-card divide-y">
            {upcomingDeadlines.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Tidak ada batas waktu tugas yang aktif saat ini.
              </div>
            ) : (
              upcomingDeadlines.map((task: PublicTaskItem) => {
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
                        <span>{formatDateTimeIndo(task.deadline)}</span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            deadline.isOverdue
                              ? "text-red-600 dark:text-red-400"
                              : deadline.isUrgent
                              ? "text-amber-600 dark:text-amber-400"
                              : ""
                          }`}
                        >
                          {deadline.text}
                        </span>
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

          {/* Recent Materials */}
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Materi Kuliah Terbaru</h2>
              </div>
              <Link href="/materials" className="text-xs text-primary hover:underline flex items-center gap-1">
                Katalog Materi <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentMaterials.length === 0 ? (
                <div className="sm:col-span-2 p-6 text-center border rounded-lg bg-card text-xs text-muted-foreground">
                  Belum ada materi perkuliahan yang diunggah.
                </div>
              ) : (
                recentMaterials.map((mat: PublicMaterialItem) => (
                  <Card key={mat.id} className="bg-card">
                    <CardContent className="p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">
                          {mat.course.name}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          {mat.materialType}
                        </span>
                      </div>
                      <div className="font-semibold text-xs leading-snug line-clamp-1">{mat.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDateIndo(mat.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Announcements & Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Pengumuman Kelas</h2>
            </div>
            <Link href="/announcements" className="text-xs text-primary hover:underline flex items-center gap-1">
              Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentAnnouncements.length === 0 ? (
              <div className="p-6 text-center border rounded-lg bg-card text-xs text-muted-foreground">
                Tidak ada pengumuman terbaru.
              </div>
            ) : (
              recentAnnouncements.map((ann: PublicAnnouncementItem) => (
                <Card key={ann.id} className="bg-card">
                  <CardContent className="p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs line-clamp-1">{ann.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDateIndo(ann.publishedAt)}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
                      {ann.content}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Quick stats / Mata kuliah */}
          <div className="border rounded-lg p-4 bg-card space-y-3">
            <div className="font-semibold text-xs text-foreground">Mata Kuliah Semester Ini</div>
            <div className="space-y-2">
              {courses.map((c: PublicCourseItem) => (
                <div key={c.id} className="p-2.5 rounded bg-muted/40 border text-xs space-y-0.5">
                  <div className="font-medium text-xs text-foreground">{c.name}</div>
                  {c.lecturer && (
                    <div className="text-[11px] text-muted-foreground">Dosen: {c.lecturer}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

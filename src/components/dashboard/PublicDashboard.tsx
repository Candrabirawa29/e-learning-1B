"use client";

import Link from "next/link";
import {
  formatDateIndo,
  formatDateTimeIndo,
  formatRelativeDeadline,
  minutesToTimeString,
} from "@/lib/date";
import { diffWibCalendarDays, parseWibLocal } from "@/lib/datetime";
import { siteConfig } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  Pin,
  ExternalLink,
  LogIn,
  ListTodo,
  CheckSquare,
  Home,
  Globe,
  Timer,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PublicTaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: Date | string | null;
  course: { name: string; code?: string | null } | null;
}

export interface PublicMaterialItem {
  id: string;
  title: string;
  materialType: string;
  fileUrl?: string | null;
  externalUrl?: string | null;
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

export interface PublicScheduleItem {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  room?: string | null;
  course: {
    id: string;
    name: string;
    code?: string | null;
    lecturer?: string | null;
  };
}

interface PublicDashboardProps {
  announcement?: PublicAnnouncementItem | null;
  tasks: PublicTaskItem[];
  schedules: PublicScheduleItem[];
  materials: PublicMaterialItem[];
  todayDayName: string;
}

interface GroupedTasks {
  hariIni: PublicTaskItem[];
  mingguIni: PublicTaskItem[];
  nanti: PublicTaskItem[];
  sudahLewat: PublicTaskItem[];
}

function groupTasksByDeadline(tasks: PublicTaskItem[]): GroupedTasks {
  const groups: GroupedTasks = {
    hariIni: [],
    mingguIni: [],
    nanti: [],
    sudahLewat: [],
  };

  const now = new Date();

  for (const task of tasks) {
    if (!task.deadline) {
      groups.nanti.push(task);
      continue;
    }

    const d = parseWibLocal(task.deadline);
    if (!d) {
      groups.nanti.push(task);
      continue;
    }

    if (d.getTime() < now.getTime()) {
      groups.sudahLewat.push(task);
    } else {
      const calDiff = diffWibCalendarDays(d, now);
      if (calDiff === 0) {
        groups.hariIni.push(task);
      } else if (calDiff >= 1 && calDiff <= 7) {
        groups.mingguIni.push(task);
      } else {
        groups.nanti.push(task);
      }
    }
  }

  return groups;
}

/**
 * Hand-drawn Notion-style character doodle peeking over the top of the mockup window
 */
function NotionPeekerDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 85"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Head outline peeking over the edge */}
      <path
        d="M16 84 C13 52, 26 15, 52 14 C78 13, 87 46, 84 84"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="transparent"
      />
      {/* Left eyebrow */}
      <path
        d="M31 36 C35 30, 43 32, 46 35"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Right eyebrow */}
      <path
        d="M57 35 C60 30, 68 30, 72 36"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Left eye */}
      <ellipse cx="39" cy="45" rx="3.5" ry="4.5" fill="currentColor" />
      {/* Right eye */}
      <ellipse cx="64" cy="45" rx="3.5" ry="4.5" fill="currentColor" />
      {/* Nose */}
      <path
        d="M52 46 L49 61 L56 61"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hair tuft */}
      <path
        d="M48 14 C46 6, 52 4, 55 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PublicDashboard({
  announcement,
  tasks,
  schedules,
  materials,
  todayDayName,
}: PublicDashboardProps) {
  const groupedTasks = groupTasksByDeadline(tasks);

  const deadlineSections = [
    { title: "Hari Ini", items: groupedTasks.hariIni },
    { title: "Minggu Ini", items: groupedTasks.mingguIni },
    { title: "Nanti", items: groupedTasks.nanti },
    { title: "Sudah Lewat", items: groupedTasks.sudahLewat },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-16 pb-12">
      {/* ============================================================ */}
      {/* 1. NOTION-STYLE HERO SECTION                                 */}
      {/* ============================================================ */}
      <div className="text-center space-y-6 max-w-4xl mx-auto pt-6 sm:pt-10">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-muted/60 text-muted-foreground backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>{siteConfig.name} • Portal Terbuka</span>
        </div>

        {/* Big Bold Headline with Notion-style Pill Accent */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.12]">
          Satu ruang untuk kuliah, tugas, dan{" "}
          <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 align-middle text-[0.8em]">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Jadwal
          </span>{" "}
          bersama.
        </h1>

        {/* Clean Subtitle */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {siteConfig.description} Akses jadwal harian, tenggat tugas terdekat, pengumuman kelas, dan materi kuliah dalam satu workspace terpadu.
        </p>

        {/* Notion-style Call to Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/login">
            <Button size="lg" className="h-11 px-6 font-semibold text-sm gap-2 shadow-sm rounded-lg">
              <LogIn className="h-4 w-4" />
              Masuk ke Workspace
            </Button>
          </Link>
          <a href="#workspace-preview">
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-6 font-medium text-sm gap-2 rounded-lg bg-background hover:bg-muted/60"
            >
              Jelajahi Portal Publik
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. NOTION-STYLE FLOATING APP WINDOW MOCKUP                   */}
      {/* ============================================================ */}
      <div id="workspace-preview" className="relative mx-auto max-w-5xl">
        {/* Peeking Hand-drawn Doodle (Sitting on top of the window frame) */}
        <div className="absolute -top-12 sm:-top-16 right-6 sm:right-16 z-20 pointer-events-none select-none">
          <NotionPeekerDoodle className="w-14 h-14 sm:w-20 sm:h-20 text-foreground" />
        </div>

        {/* The Window Container */}
        <div className="rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
          {/* macOS / Notion Window Top Header Bar */}
          <div className="h-11 border-b bg-muted/30 px-4 flex items-center justify-between text-xs text-muted-foreground select-none">
            <div className="flex items-center gap-2">
              {/* Traffic Light Window Controls */}
              <div className="flex items-center gap-1.5 mr-2">
                <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/80 border border-red-500/30" />
                <div className="w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500/80 border border-amber-500/30" />
                <div className="w-3 h-3 rounded-full bg-emerald-400 dark:bg-emerald-500/80 border border-emerald-500/30" />
              </div>

              {/* History Nav */}
              <div className="hidden sm:flex items-center gap-1 text-muted-foreground/60 mr-2 text-sm font-light">
                <span>‹</span>
                <span>›</span>
              </div>

              {/* Active Tab */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-background border border-border/60 text-foreground font-medium text-[11px] shadow-xs">
                <span className="text-xs">🎓</span>
                <span className="truncate max-w-[130px] sm:max-w-none">{siteConfig.name} HQ</span>
                <span className="text-muted-foreground/60 text-[10px] ml-1">✕</span>
              </div>
              <span className="text-muted-foreground/60 text-xs hover:text-foreground cursor-default hidden sm:inline">
                +
              </span>
            </div>

            {/* Window Right Controls */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span>Portal Publik</span>
              </div>
              <Link
                href="/login"
                className="text-primary font-medium hover:underline flex items-center gap-1 text-xs"
              >
                Masuk <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Window Body: Notion Two-Pane Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
            {/* Left Mini Sidebar (Visible on desktop) */}
            <div className="hidden md:flex md:col-span-4 lg:col-span-3 flex-col border-r bg-muted/15 p-4 space-y-5 text-xs">
              {/* Workspace Navigation */}
              <div className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Workspace
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-accent text-accent-foreground font-medium">
                  <Home className="h-3.5 w-3.5" />
                  <span>Beranda</span>
                </div>
                <Link
                  href="/tasks"
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Semua Tugas</span>
                  </div>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Link>
                <Link
                  href="/schedule"
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Jadwal Lengkap</span>
                  </div>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Link>
                <Link
                  href="/materials"
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Bank Materi</span>
                  </div>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Link>
              </div>

              {/* Notion-style Upcoming Events Sidebar Section */}
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Jadwal Hari Ini ({todayDayName})
                  </span>
                </div>

                {schedules.length === 0 ? (
                  <div className="px-2 py-3 text-muted-foreground text-[11px] italic">
                    Tidak ada perkuliahan hari ini.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {schedules.map((s) => (
                      <div key={s.id} className="p-2 rounded-md border bg-card space-y-1">
                        <div className="font-semibold text-foreground text-[11px] truncate">
                          {s.course.name}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {minutesToTimeString(s.startMinute)} – {minutesToTimeString(s.endMinute)}
                          </span>
                        </div>
                        {siteConfig.publicSchedule.showRoom && s.room && (
                          <div className="text-[10px] text-muted-foreground">
                            Ruang: {s.room}
                          </div>
                        )}
                        {siteConfig.publicSchedule.showLecturer && s.course.lecturer && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            Dosen: {s.course.lecturer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Main Canvas */}
            <div className="md:col-span-8 lg:col-span-9 p-4 sm:p-6 space-y-6">
              {/* Page Title & Breadcrumb Header */}
              <div className="space-y-2 border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl sm:text-3xl">🎓</span>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {siteConfig.name}
                  </h2>
                  <Badge variant="outline" className="text-[10px] font-semibold ml-1">
                    Public Dashboard
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {siteConfig.title} — Ringkasan informasi akademik & perkuliahan terkini.
                </p>
              </div>

              {/* Pinned Public Announcement (Notion-style Callout Box) */}
              {announcement && (
                <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/25 p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                      <Pin className="h-3.5 w-3.5 fill-current text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">Pengumuman: {announcement.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDateIndo(announcement.publishedAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs whitespace-pre-line leading-relaxed">
                    {announcement.content}
                  </p>
                  <div className="pt-1">
                    <Link
                      href="/announcements"
                      className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Buka semua pengumuman <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}

              {/* 5 Upcoming Deadlines (Grouped by Urgency) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <ListTodo className="h-4 w-4 text-primary" />
                      <span>Batas Waktu Terdekat</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] py-0 h-4">
                      {tasks.length} Tugas
                    </Badge>
                  </div>
                  <Link
                    href="/tasks"
                    className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    Lihat semua <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {tasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-card">
                    Tidak ada batas waktu tugas aktif saat ini.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deadlineSections.map((sec) => (
                      <div key={sec.title} className="space-y-1.5">
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {sec.title}
                          </span>
                          <div className="h-px flex-1 bg-border/60" />
                        </div>

                        <div className="border rounded-lg bg-card divide-y overflow-hidden">
                          {sec.items.map((task) => {
                            const deadline = formatRelativeDeadline(task.deadline);
                            return (
                              <div
                                key={task.id}
                                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/30 transition-colors"
                              >
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-foreground truncate max-w-sm sm:max-w-md">
                                      {task.title}
                                    </span>
                                    {task.course && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] py-0 h-4 font-normal"
                                      >
                                        {task.course.name}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={cn(
                                        "font-medium",
                                        deadline.isOverdue
                                          ? "text-red-600 dark:text-red-400 font-semibold"
                                          : deadline.isUrgent
                                          ? "text-amber-600 dark:text-amber-400 font-semibold"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {deadline.text}
                                    </span>
                                    <span>•</span>
                                    <span>{formatDateTimeIndo(task.deadline)}</span>
                                  </div>
                                </div>

                                <div className="shrink-0 self-start sm:self-center">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] uppercase font-semibold"
                                  >
                                    {task.priority}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Jadwal Hari Ini untuk Mobile (Muncul hanya di viewport kecil) */}
              <div className="block md:hidden space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Jadwal Hari Ini ({todayDayName})
                  </span>
                </div>

                {schedules.length === 0 ? (
                  <div className="p-4 text-center border rounded-lg bg-card text-xs text-muted-foreground">
                    Tidak ada perkuliahan hari ini.
                  </div>
                ) : (
                  <div className="border rounded-lg bg-card divide-y">
                    {schedules.map((s) => (
                      <div key={s.id} className="p-3 space-y-1 text-xs">
                        <div className="font-semibold text-foreground">{s.course.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {minutesToTimeString(s.startMinute)} – {minutesToTimeString(s.endMinute)} WIB
                          </span>
                        </div>
                        {siteConfig.publicSchedule.showRoom && s.room && (
                          <div className="text-[11px] text-muted-foreground">Ruang: {s.room}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3 Materi Kuliah Terbaru */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Materi Kuliah Terbaru
                    </span>
                  </div>
                  <Link
                    href="/materials"
                    className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    Lihat semua <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {materials.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border rounded-lg bg-card">
                    Belum ada materi publik yang dibagikan.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {materials.map((mat) => {
                      const targetUrl = mat.fileUrl || mat.externalUrl;
                      return (
                        <Card key={mat.id} className="bg-card hover:border-primary/40 transition-colors">
                          <CardContent className="p-3 space-y-2 text-xs">
                            <div className="flex items-center justify-between gap-1">
                              <Badge
                                variant="secondary"
                                className="text-[10px] py-0 h-4 font-normal truncate max-w-[120px]"
                              >
                                {mat.course.name}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                {mat.materialType}
                              </Badge>
                            </div>
                            <div className="font-medium text-xs text-foreground line-clamp-2">
                              {mat.title}
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                              <span>{formatDateIndo(mat.createdAt)}</span>
                              {targetUrl && (
                                <a
                                  href={targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                                >
                                  Unduh <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. LOGO TICKER / FEATURE PILLS (Like Notion's Company Ticker) */}
      {/* ============================================================ */}
      <div className="border-y py-6 text-center space-y-3 bg-muted/20">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Fitur Terintegrasi Workspace
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Akses Publik Cepat</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border">
            <Timer className="h-3.5 w-3.5 text-primary" />
            <span>Timer Pomodoro PiP</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>Batas Waktu Otomatis</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span>Bank Materi Terpusat</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Jadwal Hari Ini</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. VALUE PROPOSITION CARDS                                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="p-5 rounded-xl border bg-card space-y-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ListTodo className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Tenggat Waktu Terstruktur</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Dikelompokkan otomatis berdasarkan tenggat waktu (Hari Ini, Minggu Ini, Nanti) agar tidak ada tugas penting yang terlewat.
          </p>
        </div>

        <div className="p-5 rounded-xl border bg-card space-y-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Timer className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Fokus Belajar Terbantu</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Didukung fitur Ruang Fokus dan timer Pomodoro Picture-in-Picture agar kamu tetap konsentrasi saat mengerjakan tugas kuliah.
          </p>
        </div>

        <div className="p-5 rounded-xl border bg-card space-y-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Repositori Materi Terbuka</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Slide presentasi, modul laboratorium, dan link referensi kuliah dapat diakses secara instan tanpa hambatan login.
          </p>
        </div>
      </div>
    </div>
  );
}
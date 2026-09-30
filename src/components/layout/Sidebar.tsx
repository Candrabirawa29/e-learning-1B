"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CurrentUserSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  ListTodo,
  BookOpen,
  FileCheck2,
  Megaphone,
  User,
  Users,
  ShieldCheck,
} from "lucide-react";

interface SidebarNavProps {
  session: CurrentUserSession;
  isMobile?: boolean;
}

export function SidebarNav({ session, isMobile = false }: SidebarNavProps) {
  const pathname = usePathname();
  const role = session.effectiveRole;
  const isGuest = role === "GUEST" || !session.user;
  const isPJ = role === "PJ" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  // Navigation Items
  const guestLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "Tugas Kelas", icon: CheckSquare },
    { href: "/materials", label: "Materi Kuliah", icon: BookOpen },
    { href: "/announcements", label: "Pengumuman", icon: Megaphone },
  ];

  const memberGeneralLinks = [
    { href: "/home", label: "Dashboard", icon: LayoutDashboard },
    { href: "/home/tasks", label: "Semua Tugas", icon: CheckSquare },
    { href: "/home/my-tasks", label: "Tugas Saya", icon: ListTodo },
    { href: "/home/materials", label: "Mata Kuliah & Materi", icon: BookOpen },
    { href: "/home/assignments", label: "Penugasan & Praktikum", icon: FileCheck2 },
    { href: "/home/announcements", label: "Pengumuman Kelas", icon: Megaphone },
    { href: "/home/profile", label: "Profil & Akun", icon: User },
  ];

  const pjManagementLinks = [
    { href: "/home/manage/tasks", label: "Kelola Tugas", icon: CheckSquare },
    { href: "/home/manage/materials", label: "Kelola Materi", icon: BookOpen },
    { href: "/home/manage/assignments", label: "Kelola Penugasan", icon: FileCheck2 },
    { href: "/home/manage/announcements", label: "Kelola Pengumuman", icon: Megaphone },
  ];

  const adminManagementLinks = [
    ...pjManagementLinks,
    { href: "/home/manage/members", label: "Manajemen Anggota", icon: Users },
    { href: "/home/manage/audit", label: "Log Aktivitas & Audit", icon: ShieldCheck },
  ];

  const managementLinks = isAdmin ? adminManagementLinks : isPJ ? pjManagementLinks : [];

  return (
    <nav className={cn("space-y-6 text-xs", isMobile ? "px-1" : "py-4")}>
      {isGuest ? (
        <div className="space-y-1">
          <div className="px-3 py-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Menu Publik
          </div>
          {guestLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md font-medium transition-colors",
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <div className="px-3 py-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
              Akademik & Tugas
            </div>
            {memberGeneralLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md font-medium transition-colors",
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {managementLinks.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <div className="px-3 py-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                {isAdmin ? "Administrasi (Admin)" : "Manajemen Kelas (PJ)"}
              </div>
              {managementLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md font-medium transition-colors",
                      isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </nav>
  );
}

export function Sidebar({ session }: { session: CurrentUserSession }) {
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r min-h-[calc(100vh-3.5rem)] bg-background p-4">
      <SidebarNav session={session} />
    </aside>
  );
}

"use client";

import Link from "next/link";
import { logoutAction, setViewAsAction } from "@/actions/auth";
import { CurrentUserSession, EffectiveRole } from "@/lib/auth/session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, LogOut, User, Menu, ShieldAlert } from "lucide-react";
import { useTransition } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./Sidebar";

interface NavbarProps {
  session: CurrentUserSession;
}

export function Navbar({ session }: NavbarProps) {
  const [isPending, startTransition] = useTransition();

  const handleSetViewAs = (role: EffectiveRole) => {
    startTransition(async () => {
      await setViewAsAction(role);
    });
  };

  const roleBadgeColor = {
    ADMIN: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900",
    PJ: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900",
    MEMBER: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    GUEST: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  }[session.effectiveRole];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigasi</span>
                </Button>
              }
            />
            <SheetContent side="left" className="p-0 w-72">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2 font-semibold">
                  <div className="h-8 w-8 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 flex items-center justify-center font-bold text-sm">
                    1B
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Kelas 1-B</div>
                    <div className="text-xs text-muted-foreground">Portal Akademik Terpadu</div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <SidebarNav session={session} isMobile />
              </div>
            </SheetContent>
          </Sheet>

          <Link href={session.user ? "/home" : "/"} className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs tracking-tight">
              1B
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-sm tracking-tight">Class 1-B</span>
              <span className="text-xs text-muted-foreground ml-2 hidden md:inline border-l pl-2">
                Workspace & E-Learning
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin View-As Selector */}
          {session.realRole === "ADMIN" && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    className="h-8 text-xs font-normal border-dashed gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Pratinjau:</span>
                    <span className="font-semibold">{session.effectiveRole}</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52 text-xs">
                <DropdownMenuGroup>

                  <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                    Uji Tampilan Role (View As)
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleSetViewAs("ADMIN")}
                  className={session.effectiveRole === "ADMIN" ? "font-bold bg-muted" : ""}
                >
                  Admin (Asli)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSetViewAs("PJ")}
                  className={session.effectiveRole === "PJ" ? "font-bold bg-muted" : ""}
                >
                  PJ (Pengurus Kelas)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSetViewAs("MEMBER")}
                  className={session.effectiveRole === "MEMBER" ? "font-bold bg-muted" : ""}
                >
                  Member (Mahasiswa)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSetViewAs("GUEST")}
                  className={session.effectiveRole === "GUEST" ? "font-bold bg-muted" : ""}
                >
                  Guest (Publik / Tanpa Login)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Profile or Login */}
          {session.user && session.profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="h-9 px-2 gap-2 hover:bg-muted/60">
                    <Avatar className="h-7 w-7 text-xs border">
                      <AvatarImage src={session.profile.avatarUrl || undefined} />
                      <AvatarFallback className="text-[11px] font-medium bg-zinc-200 dark:bg-zinc-800">
                        {session.profile.name?.slice(0, 2).toUpperCase() || "1B"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden lg:flex flex-col items-start text-left">
                      <span className="text-xs font-medium leading-none">
                        {session.profile.name || session.profile.email.split("@")[0]}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {session.profile.email}
                      </span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase font-semibold h-4 px-1.5 ${roleBadgeColor}`}>
                      {session.effectiveRole}
                    </Badge>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56 text-xs">
                <div className="p-2 border-b">
                  <p className="font-semibold truncate text-xs">{session.profile.name || "Mahasiswa"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{session.profile.email}</p>
                </div>
                <DropdownMenuItem
                  render={
                    <Link href="/home/profile" className="cursor-pointer flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Profil & Ganti Password
                    </Link>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={
                    <form action={logoutAction} className="w-full">
                      <button type="submit" className="w-full text-left text-red-600 dark:text-red-400 cursor-pointer flex items-center gap-2">
                        <LogOut className="h-3.5 w-3.5" />
                        Keluar (Log Out)
                      </button>
                    </form>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className={buttonVariants({ size: "sm", className: "h-8 text-xs font-medium" })}>
                Masuk (Login)
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

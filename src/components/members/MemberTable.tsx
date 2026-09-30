"use client";

import * as React from "react";
import {
  updateMemberRoleAction,
  resetMemberPasswordAction,
  toggleMemberActiveAction,
} from "@/actions/members";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateTimeIndo } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Role } from "@prisma/client";
import { MoreHorizontal, Search, Shield, KeyRound, UserCheck, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface MemberListItem {
  id: string;
  email: string;
  name: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
  role: Role;
}

interface MemberTableProps {
  members: MemberListItem[];
  session: CurrentUserSession;
}

export function MemberTable({ members, session }: MemberTableProps) {
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  const [selectedMember, setSelectedMember] = React.useState<MemberListItem | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
  const [newRole, setNewRole] = React.useState<Role>(Role.MEMBER);
  const [isUpdatingRole, setIsUpdatingRole] = React.useState(false);

  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  const filteredMembers = React.useMemo(() => {
    return members.filter((m) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchEmail = m.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      return true;
    });
  }, [members, search, roleFilter]);

  const handleRoleChangeSubmit = async () => {
    if (!selectedMember) return;
    if (selectedMember.id === session.user?.id && newRole !== "ADMIN") {
      toast.error("Anda tidak dapat menurunkan role akun admin Anda sendiri.");
      return;
    }
    setIsUpdatingRole(true);
    try {
      await updateMemberRoleAction(selectedMember.id, newRole);
      toast.success(`Role untuk ${selectedMember.email} diubah menjadi ${newRole}`);
      setRoleDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah role");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!selectedMember) return;
    setIsResetting(true);
    try {
      const res = await resetMemberPasswordAction(selectedMember.id);
      toast.success(res.message);
      setResetDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mereset password");
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleActive = async (member: MemberListItem) => {
    if (member.id === session.user?.id) {
      toast.error("Anda tidak dapat menonaktifkan akun Anda sendiri.");
      return;
    }
    try {
      await toggleMemberActiveAction(member.id, !member.isActive);
      toast.success(`Akun ${member.email} ${!member.isActive ? "diaktifkan" : "dinonaktifkan"}.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status akun");
    }
  };

  const roleBadgeColor = {
    ADMIN: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300",
    PJ: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300",
    MEMBER: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200",
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 border rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau email mahasiswa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <Select value={roleFilter} onValueChange={(val) => { if (val) setRoleFilter(val); }}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="Semua Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Semua Role</SelectItem>
            <SelectItem value={Role.ADMIN} className="text-xs">Admin</SelectItem>
            <SelectItem value={Role.PJ} className="text-xs">PJ</SelectItem>
            <SelectItem value={Role.MEMBER} className="text-xs">Member</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-[11px]">
              <TableHead className="w-[30%]">Mahasiswa</TableHead>
              <TableHead className="w-[15%]">Role</TableHead>
              <TableHead className="w-[15%]">Status Akun</TableHead>
              <TableHead className="w-[15%]">Ganti Password</TableHead>
              <TableHead className="w-[20%]">Login Terakhir</TableHead>
              <TableHead className="w-[5%] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  Tidak ada mahasiswa yang cocok dengan filter atau pencarian.
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.id} className="text-xs">
                  <TableCell className="py-2.5">
                    <div className="font-semibold text-xs text-foreground">
                      {member.name || member.email.split("@")[0]}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{member.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-semibold ${roleBadgeColor[member.role]}`}
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.isActive ? (
                      <span className="inline-flex items-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        ● Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-medium text-red-600 dark:text-red-400">
                        ● Nonaktif
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.mustChangePassword ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 font-normal">
                        Wajib Ganti
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Sudah Mengganti</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    {member.lastLoginAt ? formatDateTimeIndo(member.lastLoginAt) : "Belum pernah"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Aksi</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuGroup>

                          <DropdownMenuLabel className="text-xs">Kelola Pengguna</DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMember(member);
                            setNewRole(member.role);
                            setRoleDialogOpen(true);
                          }}
                          className="cursor-pointer gap-2"
                        >
                          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                          Ubah Role...
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMember(member);
                            setResetDialogOpen(true);
                          }}
                          className="cursor-pointer gap-2 text-amber-600 dark:text-amber-400"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset Password...
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(member)}
                          className="cursor-pointer gap-2"
                        >
                          {member.isActive ? (
                            <>
                              <UserX className="h-3.5 w-3.5 text-red-500" />
                              Nonaktifkan Akun
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                              Aktifkan Akun
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role Change Modal */}
      {selectedMember && (
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Ubah Role Pengguna</DialogTitle>
              <DialogDescription className="text-xs">
                Perbarui hak akses untuk <span className="font-semibold text-foreground">{selectedMember.email}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-xs">Pilih Role Baru</label>
                <Select value={newRole} onValueChange={(val) => { if (val) setNewRole(val as Role); }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.MEMBER} className="text-xs">
                      MEMBER (Mahasiswa Reguler)
                    </SelectItem>
                    <SelectItem value={Role.PJ} className="text-xs">
                      PJ (Pengurus Kelas / Course Manager)
                    </SelectItem>
                    <SelectItem value={Role.ADMIN} className="text-xs">
                      ADMIN (Superuser Kelas)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoleDialogOpen(false)}
                disabled={isUpdatingRole}
                className="text-xs h-8"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleRoleChangeSubmit}
                disabled={isUpdatingRole}
                className="text-xs h-8 gap-1.5"
              >
                {isUpdatingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reset Password Modal */}
      {selectedMember && (
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Konfirmasi Reset Password
              </DialogTitle>
              <DialogDescription className="text-xs">
                Apakah Anda yakin ingin mereset password untuk{" "}
                <span className="font-semibold text-foreground">{selectedMember.email}</span>?
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-semibold">Konsekuensi:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Password akan dikembalikan ke password default kelas.</li>
                <li>Mahasiswa akan diwajibkan mengganti password baru saat login berikutnya.</li>
                <li>Admin tidak pernah dapat melihat password lama pengguna.</li>
              </ul>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetDialogOpen(false)}
                disabled={isResetting}
                className="text-xs h-8"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleResetPasswordSubmit}
                disabled={isResetting}
                className="text-xs h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isResetting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

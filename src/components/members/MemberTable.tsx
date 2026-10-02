"use client";

import * as React from "react";
import {
  updateMemberRoleAction,
  updateMemberAction,
  deleteMemberAction,
  resetMemberPasswordAction,
  toggleMemberActiveAction,
  impersonateMemberAction,
} from "@/actions/members";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateTimeIndo } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  MoreHorizontal,
  Search,
  Shield,
  KeyRound,
  UserCheck,
  UserX,
  Loader2,
  LogIn,
  Edit2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  // State: Impersonate
  const [impersonatingId, setImpersonatingId] = React.useState<string | null>(null);

  // State: Edit Member Modal
  const [selectedMember, setSelectedMember] = React.useState<MemberListItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editRole, setEditRole] = React.useState<Role>(Role.MEMBER);
  const [editActive, setEditActive] = React.useState<boolean>(true);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // State: Role Change Dialog
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
  const [newRole, setNewRole] = React.useState<Role>(Role.MEMBER);
  const [isUpdatingRole, setIsUpdatingRole] = React.useState(false);

  // State: Reset Password Dialog
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  // State: Delete Member Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

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

  // Handle Masuk Sebagai Mahasiswa (Impersonate)
  const handleImpersonate = async (member: MemberListItem) => {
    if (member.id === session.user?.id) {
      toast.info("Ini adalah akun Anda sendiri saat ini.");
      return;
    }

    setImpersonatingId(member.id);
    try {
      toast.loading(`Masuk sebagai ${member.name || member.email}...`, { id: "imp-toast" });
      const res = await impersonateMemberAction(member.id);
      if (res.success) {
        toast.success(`Berhasil masuk sebagai ${member.name || member.email}.`, { id: "imp-toast" });
        router.push(res.redirectTo || "/home");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal masuk sebagai mahasiswa", { id: "imp-toast" });
      setImpersonatingId(null);
    }
  };

  // Handle Edit Member
  const handleOpenEdit = (member: MemberListItem) => {
    setSelectedMember(member);
    setEditName(member.name || member.email.split("@")[0]);
    setEditRole(member.role);
    setEditActive(member.isActive);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    if (!editName.trim()) {
      toast.error("Nama mahasiswa tidak boleh kosong.");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updateMemberAction(selectedMember.id, {
        name: editName.trim(),
        role: editRole,
        isActive: editActive,
      });
      toast.success(res.message);
      setEditDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui data anggota");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Member
  const handleOpenDelete = (member: MemberListItem) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedMember) return;

    setIsDeleting(true);
    try {
      const res = await deleteMemberAction(selectedMember.id);
      toast.success(res.message);
      setDeleteDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus anggota");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Role Change
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

  // Handle Reset Password
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

  // Handle Toggle Active
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
      {/* Search & Filter Bar */}
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
              <TableHead className="w-[28%]">Mahasiswa</TableHead>
              <TableHead className="w-[12%]">Role</TableHead>
              <TableHead className="w-[12%]">Status Akun</TableHead>
              <TableHead className="w-[14%]">Ganti Password</TableHead>
              <TableHead className="w-[16%]">Login Terakhir</TableHead>
              <TableHead className="w-[18%] text-right">Aksi</TableHead>
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
              filteredMembers.map((member) => {
                const isSelf = member.id === session.user?.id;
                const isCurrentImpersonating = impersonatingId === member.id;

                return (
                  <TableRow key={member.id} className="text-xs">
                    <TableCell className="py-2.5">
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <span>{member.name || member.email.split("@")[0]}</span>
                        {isSelf && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/40 text-primary">
                            Anda
                          </Badge>
                        )}
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
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Cepat: Masuk sebagai mahasiswa tanpa login */}
                        {!isSelf && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImpersonate(member)}
                            disabled={isCurrentImpersonating}
                            className="h-7 px-2 text-[11px] gap-1 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Masuk sebagai akun mahasiswa ini tanpa perlu password"
                          >
                            {isCurrentImpersonating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <LogIn className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            )}
                            <span className="hidden xl:inline">Masuk Sebagai</span>
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Menu Opsi</span>
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-52 text-xs">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-xs">Kelola Pengguna</DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />

                            {!isSelf && (
                              <DropdownMenuItem
                                onClick={() => handleImpersonate(member)}
                                className="cursor-pointer gap-2 font-medium text-blue-600 dark:text-blue-400"
                              >
                                <LogIn className="h-3.5 w-3.5" />
                                Masuk Sebagai Akun Ini
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(member)}
                              className="cursor-pointer gap-2"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                              Edit Data Mahasiswa...
                            </DropdownMenuItem>

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
                              Reset Password Default...
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {!isSelf && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(member)}
                                  className="cursor-pointer gap-2"
                                >
                                  {member.isActive ? (
                                    <>
                                      <UserX className="h-3.5 w-3.5 text-amber-500" />
                                      Nonaktifkan Akun
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                                      Aktifkan Akun
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleOpenDelete(member)}
                                  className="cursor-pointer gap-2 text-red-600 dark:text-red-400 focus:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Hapus dari Kelas...
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal: Edit Data Mahasiswa */}
      {selectedMember && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-primary" />
                Edit Data Mahasiswa
              </DialogTitle>
              <DialogDescription className="text-xs">
                Perbarui informasi nama lengkap, hak akses peran, dan status keaktifan akun mahasiswa.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs font-medium">
                  Alamat Email (Permanen)
                </Label>
                <Input
                  id="edit-email"
                  value={selectedMember.email}
                  disabled
                  className="h-8 text-xs bg-muted/60"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-medium">
                  Nama Lengkap Mahasiswa
                </Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Peran / Role</Label>
                  <Select value={editRole} onValueChange={(val) => { if (val) setEditRole(val as Role); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Role.MEMBER} className="text-xs">
                        MEMBER
                      </SelectItem>
                      <SelectItem value={Role.PJ} className="text-xs">
                        PJ
                      </SelectItem>
                      <SelectItem value={Role.ADMIN} className="text-xs">
                        ADMIN
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Status Akun</Label>
                  <Select
                    value={editActive ? "true" : "false"}
                    onValueChange={(val) => setEditActive(val === "true")}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true" className="text-xs">
                        Aktif
                      </SelectItem>
                      <SelectItem value="false" className="text-xs">
                        Nonaktif
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={isUpdating}
                  className="text-xs h-8"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating}
                  className="text-xs h-8 gap-1.5"
                >
                  {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Ubah Role Cepat */}
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

      {/* Modal: Reset Password */}
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
                <li>Password akan dikembalikan ke password default kelas (<code>pwuinjkt</code>).</li>
                <li>Mahasiswa akan diwajibkan mengganti password baru saat login berikutnya.</li>
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

      {/* Modal: Hapus Mahasiswa */}
      {selectedMember && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Hapus Anggota Kelas
              </DialogTitle>
              <DialogDescription className="text-xs">
                Apakah Anda yakin ingin menghapus{" "}
                <span className="font-semibold text-foreground">
                  {selectedMember.name || selectedMember.email}
                </span>{" "}
                ({selectedMember.email}) dari keanggotaan Kelas 1-B?
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-[11px] text-red-900 dark:text-red-200 space-y-1">
              <p className="font-semibold">Peringatan:</p>
              <p>
                Akun mahasiswa ini tidak akan dapat lagi mengakses workspace, tugas, dan materi Kelas 1-B.
              </p>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="text-xs h-8"
              >
                Batal
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="text-xs h-8 gap-1.5"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Hapus Anggota
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

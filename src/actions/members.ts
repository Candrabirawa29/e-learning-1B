"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession, assertCanMutate } from "@/lib/auth/session";
import { canManageMembers } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import { ActivityAction, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updateMemberRoleAction(profileId: string, newRole: Role) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  if (!canManageMembers(session)) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat mengubah role anggota.");
  }

  // Ambil kelas 1-B
  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) {
    throw new Error("Kelas 1-B tidak ditemukan.");
  }

  // Cek apakah target adalah admin dan kita berusaha mengubah role admin terakhir
  const targetMembership = await prisma.classMembership.findUnique({
    where: {
      classId_profileId: {
        classId: class1B.id,
        profileId,
      },
    },
    include: { profile: true },
  });

  if (!targetMembership) {
    throw new Error("Keanggotaan mahasiswa tidak ditemukan.");
  }

  // Jika target saat ini adalah ADMIN dan role baru bukan ADMIN:
  if (targetMembership.role === Role.ADMIN && newRole !== Role.ADMIN) {
    const totalAdmins = await prisma.classMembership.count({
      where: {
        classId: class1B.id,
        role: Role.ADMIN,
      },
    });

    if (totalAdmins <= 1) {
      throw new Error(
        "Operasi dibatalkan: Sistem harus memiliki setidaknya satu Admin. Anda tidak dapat mencopot role Admin terakhir."
      );
    }
  }

  await prisma.classMembership.update({
    where: {
      classId_profileId: {
        classId: class1B.id,
        profileId,
      },
    },
    data: { role: newRole },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.ROLE_CHANGED,
    entityType: "ClassMembership",
    entityId: profileId,
    metadata: {
      targetEmail: targetMembership.profile.email,
      oldRole: targetMembership.role,
      newRole,
    },
  });

  revalidatePath("/home/manage/members");
  return { success: true };
}

export async function resetMemberPasswordAction(profileId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  if (!canManageMembers(session)) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat mereset password anggota.");
  }

  const targetProfile = await prisma.profile.findUnique({
    where: { id: profileId },
  });

  if (!targetProfile) {
    throw new Error("Profil anggota tidak ditemukan.");
  }

  const defaultPassword = process.env.DEFAULT_INITIAL_PASSWORD;
  if (!defaultPassword) {
    throw new Error("DEFAULT_INITIAL_PASSWORD belum dikonfigurasi di environment server.");
  }
  const supabaseAdmin = createAdminClient();

  if (supabaseAdmin) {
    // Reset password melalui Supabase Auth Admin API (server-side only)
    const { error: resetAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      targetProfile.id,
      {
        password: defaultPassword,
      }
    );

    if (resetAuthError) {
      throw new Error(`Gagal mereset password di Supabase Auth: ${resetAuthError.message}`);
    }
  }

  // Set mustChangePassword = true di database sehingga wajib ganti password saat login
  await prisma.profile.update({
    where: { id: profileId },
    data: { mustChangePassword: true },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.PASSWORD_RESET,
    entityType: "Profile",
    entityId: profileId,
    metadata: { targetEmail: targetProfile.email, resetBy: session.profile.email },
  });

  revalidatePath("/home/manage/members");
  return {
    success: true,
    message: `Password untuk ${targetProfile.email} berhasil direset ke password awal default. Mahasiswa wajib mengganti password saat login berikutnya.`,
  };
}

export async function toggleMemberActiveAction(profileId: string, isActive: boolean) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  if (!canManageMembers(session)) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat mengaktifkan/menonaktifkan anggota.");
  }

  // Cegah admin menonaktifkan akun sendiri
  if (profileId === session.profile.id && !isActive) {
    throw new Error("Anda tidak dapat menonaktifkan akun Anda sendiri.");
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: { isActive },
  });

  revalidatePath("/home/manage/members");
  return { success: true };
}

export async function updateProfileAction(data: { name?: string; avatarUrl?: string }) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  await prisma.profile.update({
    where: { id: session.profile.id },
    data: {
      name: data.name?.trim() || null,
      avatarUrl: data.avatarUrl || null,
    },
  });

  revalidatePath("/home/profile");
  revalidatePath("/home");
  return { success: true };
}

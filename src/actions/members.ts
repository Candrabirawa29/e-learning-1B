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

export async function createMemberAction(data: {
  name: string;
  email: string;
  role: Role;
  password?: string;
}) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  if (!canManageMembers(session)) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat menambahkan anggota.");
  }

  const normalizedEmail = data.email.toLowerCase().trim();
  const trimmedName = data.name.trim();

  if (!trimmedName) {
    throw new Error("Nama mahasiswa tidak boleh kosong.");
  }

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Format email tidak valid.");
  }

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) {
    throw new Error("Data Kelas 1-B belum terdaftar.");
  }

  // Cek apakah sudah terdaftar di kelas 1-B
  const existingMembership = await prisma.classMembership.findFirst({
    where: {
      classId: class1B.id,
      profile: { email: normalizedEmail },
    },
    include: { profile: true },
  });

  if (existingMembership) {
    throw new Error(`Email ${normalizedEmail} sudah terdaftar sebagai anggota Kelas 1-B.`);
  }

  const defaultPassword =
    data.password?.trim() ||
    process.env.DEFAULT_INITIAL_PASSWORD ||
    "pwuinjkt";

  const supabaseAdmin = createAdminClient();
  let authUserId: string | null = null;

  if (supabaseAdmin) {
    try {
      // Periksa apakah user sudah terdaftar di Supabase Auth
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const existingAuthUser = listData?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
        // Perbarui password jika admin menyediakannya secara spesifik
        if (data.password?.trim()) {
          await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            password: data.password.trim(),
          });
        }
      } else {
        const { data: newAuthUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { name: trimmedName, email: normalizedEmail },
        });

        if (authErr) {
          throw new Error(`Gagal mendaftarkan akun di Supabase Auth: ${authErr.message}`);
        }
        authUserId = newAuthUser.user.id;
      }
    } catch (err: unknown) {
      console.warn("Gagal sinkronisasi Supabase Admin Auth:", err);
      if (err instanceof Error && err.message.startsWith("Gagal mendaftarkan")) {
        throw err;
      }
    }
  }

  if (!authUserId) {
    const existingProfile = await prisma.profile.findUnique({
      where: { email: normalizedEmail },
    });
    authUserId = existingProfile?.id || crypto.randomUUID();
  }

  // Buat atau hubungkan Profil dan Keanggotaan Kelas
  await prisma.profile.upsert({
    where: { email: normalizedEmail },
    update: {
      name: trimmedName,
      isActive: true,
      memberships: {
        upsert: {
          where: {
            classId_profileId: {
              classId: class1B.id,
              profileId: authUserId,
            },
          },
          update: { role: data.role },
          create: { classId: class1B.id, role: data.role },
        },
      },
    },
    create: {
      id: authUserId,
      email: normalizedEmail,
      name: trimmedName,
      mustChangePassword: true,
      isActive: true,
      memberships: {
        create: {
          classId: class1B.id,
          role: data.role,
        },
      },
    },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.ROLE_CHANGED,
    entityType: "Profile",
    entityId: authUserId,
    metadata: {
      action: "MEMBER_CREATED",
      email: normalizedEmail,
      name: trimmedName,
      role: data.role,
      createdBy: session.profile.email,
    },
  });

  revalidatePath("/home/manage/members");
  return {
    success: true,
    message: `Mahasiswa ${trimmedName} (${normalizedEmail}) berhasil ditambahkan ke Kelas 1-B.`,
  };
}

export async function updateMemberAction(
  profileId: string,
  data: { name: string; role: Role; isActive: boolean }
) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  if (!canManageMembers(session)) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat mengedit data anggota.");
  }

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) {
    throw new Error("Kelas 1-B tidak ditemukan.");
  }

  // Cek keanggotaan
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

  // Cegah admin menonaktifkan akun sendiri
  if (profileId === session.profile.id && !data.isActive) {
    throw new Error("Anda tidak dapat menonaktifkan akun Admin Anda sendiri.");
  }

  // Cegah mencopot role admin terakhir
  if (targetMembership.role === Role.ADMIN && data.role !== Role.ADMIN) {
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

  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error("Nama mahasiswa tidak boleh kosong.");
  }

  await prisma.$transaction([
    prisma.profile.update({
      where: { id: profileId },
      data: {
        name: trimmedName,
        isActive: data.isActive,
      },
    }),
    prisma.classMembership.update({
      where: {
        classId_profileId: {
          classId: class1B.id,
          profileId,
        },
      },
      data: { role: data.role },
    }),
  ]);

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.ROLE_CHANGED,
    entityType: "Profile",
    entityId: profileId,
    metadata: {
      action: "MEMBER_UPDATED",
      email: targetMembership.profile.email,
      name: trimmedName,
      oldRole: targetMembership.role,
      newRole: data.role,
      isActive: data.isActive,
    },
  });

  revalidatePath("/home/manage/members");
  return { success: true, message: `Data anggota ${trimmedName} berhasil diperbarui.` };
}

export async function deleteMemberAction(profileId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  if (!canManageMembers(session)) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat menghapus anggota.");
  }

  if (profileId === session.profile.id) {
    throw new Error("Anda tidak dapat menghapus akun Anda sendiri.");
  }

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) {
    throw new Error("Kelas 1-B tidak ditemukan.");
  }

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

  if (targetMembership.role === Role.ADMIN) {
    const totalAdmins = await prisma.classMembership.count({
      where: {
        classId: class1B.id,
        role: Role.ADMIN,
      },
    });

    if (totalAdmins <= 1) {
      throw new Error("Tidak dapat menghapus satu-satunya Admin kelas.");
    }
  }

  const targetEmail = targetMembership.profile.email;
  const targetName = targetMembership.profile.name || targetEmail;

  // Hapus keanggotaan kelas
  await prisma.classMembership.delete({
    where: {
      classId_profileId: {
        classId: class1B.id,
        profileId,
      },
    },
  });

  // Hapus akun dari Supabase Auth jika client tersedia
  const supabaseAdmin = createAdminClient();
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(profileId);
    } catch (err) {
      console.warn("Gagal menghapus user dari Supabase Auth:", err);
    }
  }

  // Bersihkan profil jika tidak terikat ke kelas lain
  try {
    const otherMemberships = await prisma.classMembership.count({
      where: { profileId },
    });
    if (otherMemberships === 0) {
      await prisma.profile.delete({
        where: { id: profileId },
      });
    }
  } catch (err) {
    console.warn("Profil tidak dapat dihapus penuh karena memiliki riwayat referensi aktivitas/tugas:", err);
  }

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.ROLE_CHANGED,
    entityType: "ClassMembership",
    entityId: profileId,
    metadata: {
      action: "MEMBER_DELETED",
      deletedEmail: targetEmail,
      deletedName: targetName,
    },
  });

  revalidatePath("/home/manage/members");
  return { success: true, message: `Mahasiswa ${targetName} (${targetEmail}) berhasil dihapus.` };
}

export async function impersonateMemberAction(profileId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile || session.realRole !== Role.ADMIN) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat masuk sebagai mahasiswa.");
  }

  const targetProfile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { memberships: true },
  });

  if (!targetProfile) {
    throw new Error("Mahasiswa tidak ditemukan.");
  }

  const { cookies } = await import("next/headers");
  const { IMPERSONATE_COOKIE, VIEW_AS_COOKIE } = await import("@/lib/auth/session");

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, profileId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.delete(VIEW_AS_COOKIE);

  revalidatePath("/", "layout");
  return { success: true, redirectTo: "/home" };
}

export async function stopImpersonateAction() {
  const { cookies } = await import("next/headers");
  const { IMPERSONATE_COOKIE, VIEW_AS_COOKIE } = await import("@/lib/auth/session");

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);
  cookieStore.delete(VIEW_AS_COOKIE);

  revalidatePath("/", "layout");
  return { success: true, redirectTo: "/home/manage/members" };
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

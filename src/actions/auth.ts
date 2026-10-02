"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, VIEW_AS_COOKIE, EffectiveRole } from "@/lib/auth/session";
import { loginSchema, changePasswordSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { ActivityAction, Role } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AuthActionResult = {
  success: boolean;
  error?: string;
  redirectTo?: string;
};

export async function loginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Input tidak valid",
    };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message || "Email atau password yang Anda masukkan salah.",
    };
  }

  // Update last login di database
  const profile = await prisma.profile.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (profile) {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { lastLoginAt: new Date() },
    });

    await logActivity({
      actorId: profile.id,
      action: ActivityAction.USER_LOGIN,
      entityType: "Profile",
      entityId: profile.id,
      metadata: { email: profile.email },
    });

    // Jika mustChangePassword aktif, wajib redirect ke /change-password
    if (profile.mustChangePassword) {
      return { success: true, redirectTo: "/change-password" };
    }
  }

  return { success: true, redirectTo: "/home" };
}

export async function changePasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    return { success: false, error: "Sesi login tidak valid. Silakan login kembali." };
  }

  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const parsed = changePasswordSchema.safeParse({ newPassword, confirmPassword });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Password baru tidak memenuhi syarat",
    };
  }

  const supabase = await createClient();
  const { error: updateAuthError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateAuthError) {
    return {
      success: false,
      error: updateAuthError.message || "Gagal memperbarui password di sistem.",
    };
  }

  // Update status mustChangePassword menjadi false di profil database, dan set activatedAt jika belum ada
  const currentProfile = await prisma.profile.findUnique({
    where: { id: session.profile.id },
    select: { activatedAt: true },
  });

  await prisma.profile.update({
    where: { id: session.profile.id },
    data: {
      mustChangePassword: false,
      ...(!currentProfile?.activatedAt ? { activatedAt: new Date() } : {}),
    },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.PASSWORD_RESET,
    entityType: "Profile",
    entityId: session.profile.id,
    metadata: { reason: "User changed password directly" },
  });

  return { success: true, redirectTo: "/home" };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(VIEW_AS_COOKIE);

  redirect("/login");
}

export async function setViewAsAction(targetRole: EffectiveRole) {
  const session = await getCurrentSession();
  if (session.realRole !== Role.ADMIN) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat mengaktifkan mode pratinjau View-As.");
  }

  const cookieStore = await cookies();
  cookieStore.set(VIEW_AS_COOKIE, targetRole, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
}

export async function clearViewAsAction() {
  const cookieStore = await cookies();
  cookieStore.delete(VIEW_AS_COOKIE);
  revalidatePath("/", "layout");
}

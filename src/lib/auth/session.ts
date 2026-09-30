import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export type EffectiveRole = "GUEST" | "MEMBER" | "PJ" | "ADMIN";

export interface CurrentUserSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    mustChangePassword: boolean;
    isActive: boolean;
  } | null;
  membership: {
    id: string;
    classId: string;
    role: Role;
  } | null;
  realRole: Role | null;
  effectiveRole: EffectiveRole;
  isViewAs: boolean;
  viewAsRole: EffectiveRole | null;
}

export const VIEW_AS_COOKIE = "class1b_view_as";

export const getCurrentSession = cache(async (): Promise<CurrentUserSession> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return {
      user: null,
      profile: null,
      membership: null,
      realRole: null,
      effectiveRole: "GUEST",
      isViewAs: false,
      viewAsRole: null,
    };
  }

  // Ambil profil & keanggotaan kelas dari Prisma
  let profile = await prisma.profile.findUnique({
    where: { email: user.email.toLowerCase() },
    include: {
      memberships: {
        include: {
          class: true,
        },
      },
    },
  });

  // Jika profil belum ada di Prisma, sinkronkan otomatis
  if (!profile) {
    const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
    const isAdmin = user.email.toLowerCase() === "damarraditya@gmail.com";
    const initialRole = isAdmin ? Role.ADMIN : Role.MEMBER;

    profile = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email.toLowerCase(),
        name: user.email.split("@")[0].replace(/[\._]/g, " "),
        mustChangePassword: !isAdmin,
        isActive: true,
        memberships: class1B
          ? {
              create: {
                classId: class1B.id,
                role: initialRole,
              },
            }
          : undefined,
      },
      include: {
        memberships: {
          include: {
            class: true,
          },
        },
      },
    });
  }

  const membership = profile.memberships[0] || null;
  const realRole = membership?.role || Role.MEMBER;

  // Cek cookie View-As
  const cookieStore = await cookies();
  const viewAsCookieVal = cookieStore.get(VIEW_AS_COOKIE)?.value;

  let effectiveRole: EffectiveRole = realRole;
  let isViewAs = false;
  let viewAsRole: EffectiveRole | null = null;

  // Hanya Admin sungguhan yang diizinkan menggunakan View-As preview
  if (
    realRole === Role.ADMIN &&
    viewAsCookieVal &&
    ["GUEST", "MEMBER", "PJ"].includes(viewAsCookieVal)
  ) {
    effectiveRole = viewAsCookieVal as EffectiveRole;
    isViewAs = true;
    viewAsRole = viewAsCookieVal as EffectiveRole;
  }

  return {
    user: {
      id: profile.id,
      email: profile.email,
    },
    profile: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      mustChangePassword: profile.mustChangePassword,
      isActive: profile.isActive,
    },
    membership: membership
      ? {
          id: membership.id,
          classId: membership.classId,
          role: membership.role,
        }
      : null,
    realRole,
    effectiveRole,
    isViewAs,
    viewAsRole,
  };
});

export const requireUser = cache(async (): Promise<CurrentUserSession> => {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    redirect("/login");
  }

  if (session.profile.mustChangePassword) {
    redirect("/change-password");
  }

  return session;
});

export const requireAdmin = cache(async (): Promise<CurrentUserSession> => {
  const session = await requireUser();
  if (session.realRole !== Role.ADMIN) {
    throw new Error("Akses ditolak: Anda harus memiliki hak akses Admin.");
  }
  return session;
});

export const requirePJOrAdmin = cache(async (): Promise<CurrentUserSession> => {
  const session = await requireUser();
  if (session.realRole !== Role.ADMIN && session.realRole !== Role.PJ) {
    throw new Error("Akses ditolak: Anda harus memiliki hak akses PJ atau Admin.");
  }
  return session;
});

export function assertCanMutate(session: CurrentUserSession) {
  if (session.isViewAs) {
    throw new Error(
      "Aksi mutation diblokir: Anda sedang berada dalam mode pratinjau (View As). Silakan kembali ke mode Admin untuk melakukan perubahan data."
    );
  }
}

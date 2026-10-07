import { TaskPriority, TaskStatus, TaskTargetType } from "@prisma/client";

export interface TaskDetailDataMinimal {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date | string | null;
  targetType: TaskTargetType;
  attachmentUrl: string | null;
  submissionUrl?: string | null;
  courseId?: string | null;
  createdById: string;
  course?: { id: string; name: string; code: string | null } | null;
  createdBy?: { id: string; name: string | null; email: string };
  assignments: { profile: { id: string; name: string | null; email: string } }[];
  progresses: {
    profileId: string;
    status: TaskStatus;
    progress: number;
    notes: string | null;
    updatedAt?: Date | string | null;
    profile?: { name: string | null; email: string };
  }[];
}

export interface MemberProgressSummary {
  profileId: string;
  name: string;
  email: string;
  status: TaskStatus;
  progress: number;
  notes: string | null;
  updatedAt: Date | string | null;
}

export interface TaskProgressSummary {
  taskId: string;
  title: string;
  totalRecipients: number;
  doneCount: number;
  inProgressCount: number;
  reviewCount: number;
  todoCount: number;
  completionPercentage: number;
  memberProgresses: MemberProgressSummary[];
}

/**
 * Menghitung ringkasan progres pengerjaan seluruh mahasiswa untuk sebuah tugas.
 * Mahasiswa yang belum pernah memperbarui progres secara otomatis dihitung dalam status TODO (0%).
 */
export function calculateTaskProgressSummary(
  task: TaskDetailDataMinimal,
  allMembers: { id: string; name: string | null; email: string }[]
): TaskProgressSummary {
  // Tentukan mahasiswa target penugasan
  let targetMembers: { id: string; name: string | null; email: string }[] = [];

  if (task.targetType === TaskTargetType.ALL) {
    targetMembers = allMembers;
  } else {
    // Pada target SPECIFIC, ambil dari task.assignments
    const assignedIds = new Set(task.assignments.map((a) => a.profile.id));
    targetMembers = allMembers.filter((m) => assignedIds.has(m.id));

    // Jika ada yang belum terdaftar di allMembers (fallback)
    if (targetMembers.length === 0 && task.assignments.length > 0) {
      targetMembers = task.assignments.map((a) => a.profile);
    }
  }

  // Buat lookup map dari task.progresses
  const progressMap = new Map<
    string,
    {
      status: TaskStatus;
      progress: number;
      notes: string | null;
      updatedAt: Date | string | null;
    }
  >();

  for (const p of task.progresses) {
    progressMap.set(p.profileId, {
      status: p.status,
      progress: p.progress,
      notes: p.notes,
      updatedAt: p.updatedAt || null,
    });
  }

  // Petakan setiap target member ke status pengerjaannya
  const memberProgresses: MemberProgressSummary[] = targetMembers.map((member) => {
    const prog = progressMap.get(member.id);
    if (prog) {
      return {
        profileId: member.id,
        name: member.name || member.email.split("@")[0],
        email: member.email,
        status: prog.status,
        progress: prog.progress,
        notes: prog.notes,
        updatedAt: prog.updatedAt,
      };
    }

    return {
      profileId: member.id,
      name: member.name || member.email.split("@")[0],
      email: member.email,
      status: TaskStatus.TODO,
      progress: 0,
      notes: null,
      updatedAt: null,
    };
  });

  // Urutkan: DONE di paling atas jika sorting progress desc, atau urutkan abjad nama
  memberProgresses.sort((a, b) => {
    // Kelompokkan berdasarkan status: DONE -> REVIEW -> IN_PROGRESS -> TODO
    const weight: Record<TaskStatus, number> = {
      DONE: 4,
      REVIEW: 3,
      IN_PROGRESS: 2,
      TODO: 1,
    };
    if (weight[b.status] !== weight[a.status]) {
      return weight[b.status] - weight[a.status];
    }
    return a.name.localeCompare(b.name);
  });

  const totalRecipients = targetMembers.length;
  const doneCount = memberProgresses.filter((m) => m.status === TaskStatus.DONE).length;
  const inProgressCount = memberProgresses.filter((m) => m.status === TaskStatus.IN_PROGRESS).length;
  const reviewCount = memberProgresses.filter((m) => m.status === TaskStatus.REVIEW).length;
  const todoCount = memberProgresses.filter((m) => m.status === TaskStatus.TODO).length;

  const completionPercentage =
    totalRecipients > 0 ? Math.round((doneCount / totalRecipients) * 100) : 0;

  return {
    taskId: task.id,
    title: task.title,
    totalRecipients,
    doneCount,
    inProgressCount,
    reviewCount,
    todoCount,
    completionPercentage,
    memberProgresses,
  };
}

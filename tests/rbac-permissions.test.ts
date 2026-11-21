import { test, describe } from "node:test";
import assert from "node:assert";
import {
  canCreateTask,
  canEditTask,
  canDeleteTask,
  canUploadMaterial,
  canManageMaterial,
  canManageTopic,
  canCreateAnnouncement,
  canManageAnnouncement,
  canManageCourse,
} from "../src/lib/auth/rbac";
import { CurrentUserSession } from "../src/lib/auth/session";

describe("STEP 1: RBAC Permission Matrix Audit", () => {
  const sessionGuest: CurrentUserSession = {
    user: null,
    profile: null,
    membership: null,
    realRole: null,
    effectiveRole: "GUEST",
    isViewAs: false,
    viewAsRole: null,
  };

  const sessionMember1: CurrentUserSession = {
    user: { id: "user_member_1", email: "member1@test.com" },
    profile: {
      id: "user_member_1",
      name: "Member One",
      email: "member1@test.com",
      avatarUrl: null,
      mustChangePassword: false,
      isActive: true,
      activatedAt: new Date(),
    },
    membership: { id: "m1", classId: "class_1b", role: "MEMBER" },
    realRole: "MEMBER",
    effectiveRole: "MEMBER",
    assignedCourseIds: [],
    isViewAs: false,
    viewAsRole: null,
  };

  const sessionMember2: CurrentUserSession = {
    user: { id: "user_member_2", email: "member2@test.com" },
    profile: {
      id: "user_member_2",
      name: "Member Two",
      email: "member2@test.com",
      avatarUrl: null,
      mustChangePassword: false,
      isActive: true,
      activatedAt: new Date(),
    },
    membership: { id: "m2", classId: "class_1b", role: "MEMBER" },
    realRole: "MEMBER",
    effectiveRole: "MEMBER",
    assignedCourseIds: [],
    isViewAs: false,
    viewAsRole: null,
  };

  const sessionPjCourseA: CurrentUserSession = {
    user: { id: "user_pj_a", email: "pja@test.com" },
    profile: {
      id: "user_pj_a",
      name: "PJ Course A",
      email: "pja@test.com",
      avatarUrl: null,
      mustChangePassword: false,
      isActive: true,
      activatedAt: new Date(),
    },
    membership: { id: "m_pja", classId: "class_1b", role: "PJ" },
    realRole: "PJ",
    effectiveRole: "PJ",
    assignedCourseIds: ["course_a"],
    isViewAs: false,
    viewAsRole: null,
  };

  const sessionPjCourseB: CurrentUserSession = {
    user: { id: "user_pj_b", email: "pjb@test.com" },
    profile: {
      id: "user_pj_b",
      name: "PJ Course B",
      email: "pjb@test.com",
      avatarUrl: null,
      mustChangePassword: false,
      isActive: true,
      activatedAt: new Date(),
    },
    membership: { id: "m_pjb", classId: "class_1b", role: "PJ" },
    realRole: "PJ",
    effectiveRole: "PJ",
    assignedCourseIds: ["course_b"],
    isViewAs: false,
    viewAsRole: null,
  };

  const sessionAdmin: CurrentUserSession = {
    user: { id: "user_admin", email: "admin@test.com" },
    profile: {
      id: "user_admin",
      name: "Admin",
      email: "admin@test.com",
      avatarUrl: null,
      mustChangePassword: false,
      isActive: true,
      activatedAt: new Date(),
    },
    membership: { id: "m_admin", classId: "class_1b", role: "ADMIN" },
    realRole: "ADMIN",
    effectiveRole: "ADMIN",
    assignedCourseIds: [],
    isViewAs: false,
    viewAsRole: null,
  };

  // Mock Objects
  const taskOfCourseACreatedByMember1 = {
    id: "task_1",
    courseId: "course_a",
    createdById: "user_member_1",
  };

  const taskGeneralNoCourseCreatedByMember1 = {
    id: "task_2",
    courseId: null,
    createdById: "user_member_1",
  };

  const materialCourseAUploadedByPjA = {
    id: "mat_1",
    courseId: "course_a",
    uploadedById: "user_pj_a",
    course: { id: "course_a", kind: "REGULAR" as const, ownerId: null },
  };

  const materialExtraCourseMember1 = {
    id: "mat_extra",
    courseId: "course_extra_1",
    uploadedById: "user_member_1",
    course: { id: "course_extra_1", kind: "EXTRA" as const, ownerId: "user_member_1" },
  };

  describe("1. Task Permissions", () => {
    test("Create Task: Any logged-in member can create", () => {
      assert.strictEqual(canCreateTask(sessionGuest), false, "Guest cannot create task");
      assert.strictEqual(canCreateTask(sessionMember1), true, "Member can create task");
      assert.strictEqual(canCreateTask(sessionPjCourseA), true, "PJ can create task");
      assert.strictEqual(canCreateTask(sessionAdmin), true, "Admin can create task");
    });

    test("Edit Task / Change Status: Any logged-in member can edit", () => {
      assert.strictEqual(canEditTask(taskOfCourseACreatedByMember1, sessionGuest), false, "Guest cannot edit task");
      assert.strictEqual(canEditTask(taskOfCourseACreatedByMember1, sessionMember2), true, "Any member can edit task");
      assert.strictEqual(canEditTask(taskOfCourseACreatedByMember1, sessionPjCourseB), true, "Any PJ can edit task");
      assert.strictEqual(canEditTask(taskOfCourseACreatedByMember1, sessionAdmin), true, "Admin can edit task");
    });

    test("Delete Task (with course): Only Creator, Course PJ, or ADMIN can delete", () => {
      // Creator can delete
      assert.strictEqual(canDeleteTask(taskOfCourseACreatedByMember1, sessionMember1), true, "Creator member can delete");
      // Other member CANNOT delete
      assert.strictEqual(canDeleteTask(taskOfCourseACreatedByMember1, sessionMember2), false, "Non-creator member CANNOT delete");
      // Course A PJ can delete
      assert.strictEqual(canDeleteTask(taskOfCourseACreatedByMember1, sessionPjCourseA), true, "Course A PJ can delete");
      // Other Course B PJ CANNOT delete
      assert.strictEqual(canDeleteTask(taskOfCourseACreatedByMember1, sessionPjCourseB), false, "Course B PJ CANNOT delete");
      // Admin can delete
      assert.strictEqual(canDeleteTask(taskOfCourseACreatedByMember1, sessionAdmin), true, "Admin can delete");
      // Guest cannot delete
      assert.strictEqual(canDeleteTask(taskOfCourseACreatedByMember1, sessionGuest), false, "Guest cannot delete");
    });

    test("Delete Task (no course): Creator, ANY PJ, or ADMIN can delete", () => {
      assert.strictEqual(canDeleteTask(taskGeneralNoCourseCreatedByMember1, sessionMember1), true, "Creator member can delete");
      assert.strictEqual(canDeleteTask(taskGeneralNoCourseCreatedByMember1, sessionMember2), false, "Non-creator member CANNOT delete");
      assert.strictEqual(canDeleteTask(taskGeneralNoCourseCreatedByMember1, sessionPjCourseA), true, "Any PJ can delete course-less task");
      assert.strictEqual(canDeleteTask(taskGeneralNoCourseCreatedByMember1, sessionPjCourseB), true, "Any PJ can delete course-less task");
      assert.strictEqual(canDeleteTask(taskGeneralNoCourseCreatedByMember1, sessionAdmin), true, "Admin can delete");
    });
  });

  describe("2. Course Materials & Topics Permissions", () => {
    test("Upload Material to Regular Course: Uploader/PJ of course or Admin (Regular Member is read-only)", () => {
      const courseA = { id: "course_a", kind: "REGULAR" as const, ownerId: null };
      assert.strictEqual(canUploadMaterial(sessionGuest, courseA), false, "Guest cannot upload");
      assert.strictEqual(canUploadMaterial(sessionMember1, courseA), false, "Regular member CANNOT upload to regular course");
      assert.strictEqual(canUploadMaterial(sessionPjCourseA, courseA), true, "PJ of Course A can upload");
      assert.strictEqual(canUploadMaterial(sessionPjCourseB, courseA), false, "PJ of Course B CANNOT upload to Course A");
      assert.strictEqual(canUploadMaterial(sessionAdmin, courseA), true, "Admin can upload");
    });

    test("Manage/Delete Material: Uploader, PJ of that course, or Admin (Regular Member cannot delete)", () => {
      assert.strictEqual(canManageMaterial(materialCourseAUploadedByPjA, sessionGuest), false);
      assert.strictEqual(canManageMaterial(materialCourseAUploadedByPjA, sessionMember1), false, "Regular member CANNOT delete material");
      assert.strictEqual(canManageMaterial(materialCourseAUploadedByPjA, sessionPjCourseA), true, "Uploader/PJ can delete");
      assert.strictEqual(canManageMaterial(materialCourseAUploadedByPjA, sessionPjCourseB), false, "Other course PJ CANNOT delete");
      assert.strictEqual(canManageMaterial(materialCourseAUploadedByPjA, sessionAdmin), true, "Admin can delete");
    });

    test("Manage Topics: PJ of course or Admin only (Regular Member is read-only)", () => {
      const courseA = { id: "course_a", kind: "REGULAR" as const, ownerId: null };
      assert.strictEqual(canManageTopic(sessionGuest, courseA), false);
      assert.strictEqual(canManageTopic(sessionMember1, courseA), false, "Regular member CANNOT manage topics");
      assert.strictEqual(canManageTopic(sessionPjCourseA, courseA), true, "PJ of Course A can manage topics");
      assert.strictEqual(canManageTopic(sessionPjCourseB, courseA), false, "PJ of Course B CANNOT manage Course A topics");
      assert.strictEqual(canManageTopic(sessionAdmin, courseA), true, "Admin can manage topics");
    });
  });

  describe("3. Belajar Tambahan (EXTRA/Personal Courses) Permissions", () => {
    test("Owner only can manage extra courses, materials, and topics", () => {
      const extraCourse = { id: "course_extra_1", kind: "EXTRA" as const, ownerId: "user_member_1" };

      // Manage Course
      assert.strictEqual(canManageCourse(sessionMember1, extraCourse), true, "Owner can manage");
      assert.strictEqual(canManageCourse(sessionMember2, extraCourse), false, "Other member cannot manage");
      assert.strictEqual(canManageCourse(sessionPjCourseA, extraCourse), false, "PJ cannot manage other's EXTRA course");

      // Upload Material to EXTRA
      assert.strictEqual(canUploadMaterial(sessionMember1, extraCourse), true, "Owner can upload to extra course");
      assert.strictEqual(canUploadMaterial(sessionMember2, extraCourse), false, "Other member cannot upload to extra course");

      // Manage Material in EXTRA
      assert.strictEqual(canManageMaterial(materialExtraCourseMember1, sessionMember1), true, "Owner can manage extra material");
      assert.strictEqual(canManageMaterial(materialExtraCourseMember1, sessionMember2), false, "Other cannot manage extra material");
    });
  });

  describe("4. Announcements Permissions", () => {
    test("Announcements: ADMIN and PJ only", () => {
      assert.strictEqual(canCreateAnnouncement(sessionGuest), false, "Guest cannot create announcement");
      assert.strictEqual(canCreateAnnouncement(sessionMember1), false, "Member cannot create announcement");
      assert.strictEqual(canCreateAnnouncement(sessionPjCourseA), true, "PJ can create announcement");
      assert.strictEqual(canCreateAnnouncement(sessionAdmin), true, "Admin can create announcement");

      const announcementByPjA = { createdById: "user_pj_a" };
      assert.strictEqual(canManageAnnouncement(announcementByPjA, sessionMember1), false, "Member cannot manage announcement");
      assert.strictEqual(canManageAnnouncement(announcementByPjA, sessionPjCourseA), true, "Creator PJ can manage announcement");
      assert.strictEqual(canManageAnnouncement(announcementByPjA, sessionAdmin), true, "Admin can manage announcement");
    });
  });
});

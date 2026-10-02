"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { canManageCourse } from "@/lib/auth/rbac";
import { deleteTopicAction, reorderTopicsAction } from "@/actions/courses";
import { deleteMaterialAction } from "@/actions/materials";
import { TopicDialog } from "./TopicDialog";
import { UploadMaterialDialog } from "@/components/materials/UploadMaterialDialog";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskDetailData } from "@/components/tasks/TaskDetailModal";
import { MemberOption } from "@/components/tasks/MemberSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Plus,
  BookOpen,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateIndo } from "@/lib/date";

export interface MaterialItem {
  id: string;
  courseId: string;
  topicId: string | null;
  title: string;
  description: string | null;
  materialType: string;
  provider: string;
  fileUrl: string | null;
  publicId: string | null;
  fileName: string | null;
  fileSize: number | null;
  externalUrl: string | null;
  createdAt: Date | string;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface TopicItem {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
}

interface CourseDetailTabsProps {
  course: {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    lecturer: string | null;
  };
  topics: TopicItem[];
  materials: MaterialItem[];
  tasks: TaskDetailData[];
  members: MemberOption[];
  session: CurrentUserSession;
}

export function CourseDetailTabs({
  course,
  topics,
  materials,
  tasks,
  members,
  session,
}: CourseDetailTabsProps) {
  const [expandedTopics, setExpandedTopics] = React.useState<Record<string, boolean>>(() => {
    // Default: buka semua topik
    const initial: Record<string, boolean> = { general: true };
    for (const t of topics) {
      initial[t.id] = true;
    }
    return initial;
  });

  const [topicDialogOpen, setTopicDialogOpen] = React.useState(false);
  const [selectedTopicForEdit, setSelectedTopicForEdit] = React.useState<TopicItem | null>(null);

  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [selectedTopicForUpload, setSelectedTopicForUpload] = React.useState<string | undefined>(undefined);

  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [isReordering, setIsReordering] = React.useState(false);

  const canManage = canManageCourse(session, course.id);

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteTopic = async (topicId: string, title: string) => {
    if (
      !confirm(
        `Hapus sub-topik "${title}"? Seluruh materi di dalam sub-topik ini akan otomatis dipindahkan ke bagian "Materi Umum".`
      )
    ) {
      return;
    }
    try {
      await deleteTopicAction(topicId);
      toast.success("Sub-topik berhasil dihapus. Materi dipindahkan ke Umum.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus sub-topik.");
    }
  };

  const handleMoveTopic = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= topics.length) return;

    const newOrder = [...topics];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setIsReordering(true);
    try {
      await reorderTopicsAction(
        course.id,
        newOrder.map((t) => t.id)
      );
      toast.success("Urutan sub-topik diperbarui.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah urutan sub-topik.");
    } finally {
      setIsReordering(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string, title: string) => {
    if (!confirm(`Hapus materi "${title}"? Berkas yang tersimpan di Cloudinary akan dihapus secara permanen.`)) {
      return;
    }
    try {
      await deleteMaterialAction(materialId);
      toast.success("Materi berhasil dihapus.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus materi.");
    }
  };

  // Materi tanpa sub-topik (Umum)
  const generalMaterials = materials.filter((m) => !m.topicId);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="materials" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3">
          <TabsList className="h-8 p-0.5 bg-muted self-start">
            <TabsTrigger value="materials" className="text-xs h-7 px-3 gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Materi & Silabus ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs h-7 px-3 gap-1.5">
              <CheckSquare className="h-3.5 w-3.5" />
              Tugas Mata Kuliah ({tasks.length})
            </TabsTrigger>
          </TabsList>

          {canManage && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedTopicForEdit(null);
                  setTopicDialogOpen(true);
                }}
                className="h-8 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Sub-Topik
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedTopicForUpload(undefined);
                  setUploadDialogOpen(true);
                }}
                className="h-8 text-xs gap-1.5 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Unggah Materi
              </Button>
            </div>
          )}
        </div>

        {/* TAB MATERI */}
        <TabsContent value="materials" className="space-y-4 m-0">
          {topics.length === 0 && generalMaterials.length === 0 ? (
            <div className="p-12 text-center border rounded-lg bg-card text-muted-foreground text-xs space-y-2">
              <p>Belum ada materi perkuliahan untuk mata kuliah ini.</p>
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUploadDialogOpen(true)}
                  className="text-xs h-8 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Unggah Materi Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daftar Sub-Topik */}
              {topics.map((topic, index) => {
                const topicMaterials = materials.filter((m) => m.topicId === topic.id);
                const isExpanded = !!expandedTopics[topic.id];

                return (
                  <div key={topic.id} className="border rounded-lg bg-card overflow-hidden">
                    {/* Header Sub-Topik (Collapsible) */}
                    <div className="flex items-center justify-between p-3.5 bg-muted/30 border-b select-none">
                      <div
                        onClick={() => toggleTopic(topic.id)}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {topic.title}
                            </span>
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">
                              {topicMaterials.length} Materi
                            </Badge>
                          </div>
                          {topic.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {topic.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleMoveTopic(index, "up")}
                            disabled={index === 0 || isReordering}
                            title="Pindah ke atas"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleMoveTopic(index, "down")}
                            disabled={index === topics.length - 1 || isReordering}
                            title="Pindah ke bawah"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedTopicForEdit(topic);
                              setTopicDialogOpen(true);
                            }}
                            title="Edit nama sub-topik"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteTopic(topic.id, topic.title)}
                            title="Hapus sub-topik"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Konten Materi di Dalam Sub-topik */}
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {topicMaterials.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground italic border border-dashed rounded">
                            Belum ada materi di sub-topik ini.
                          </div>
                        ) : (
                          topicMaterials.map((m) => (
                            <MaterialCard
                              key={m.id}
                              material={m}
                              canManage={canManage}
                              onDelete={handleDeleteMaterial}
                              formatFileSize={formatFileSize}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Section Materi Umum (topicId === null) */}
              <div className="border rounded-lg bg-card overflow-hidden">
                <div
                  onClick={() => toggleTopic("general")}
                  className="flex items-center justify-between p-3.5 bg-muted/20 border-b cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    {expandedTopics.general ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-semibold text-xs text-foreground">
                      Materi Umum / Referensi Lainnya
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                      {generalMaterials.length} Materi
                    </Badge>
                  </div>
                </div>

                {expandedTopics.general && (
                  <div className="p-3 space-y-2">
                    {generalMaterials.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground italic border border-dashed rounded">
                        Tidak ada materi umum.
                      </div>
                    ) : (
                      generalMaterials.map((m) => (
                        <MaterialCard
                          key={m.id}
                          material={m}
                          canManage={canManage}
                          onDelete={handleDeleteMaterial}
                          formatFileSize={formatFileSize}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB TUGAS */}
        <TabsContent value="tasks" className="space-y-4 m-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground">
              Daftar Tugas Mata Kuliah {course.name}
            </h3>
            {canManage && (
              <Button
                size="sm"
                onClick={() => setCreateTaskOpen(true)}
                className="h-8 text-xs gap-1.5 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Buat Tugas Matkul Ini
              </Button>
            )}
          </div>

          <TaskList
            tasks={tasks}
            courses={[{ id: course.id, name: course.name, code: course.code }]}
            members={members}
            session={session}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {canManage && (
        <>
          <TopicDialog
            courseId={course.id}
            mode={selectedTopicForEdit ? "edit" : "create"}
            topic={selectedTopicForEdit}
            open={topicDialogOpen}
            onOpenChange={setTopicDialogOpen}
          />

          <UploadMaterialDialog
            courses={[{ id: course.id, name: course.name, topics }]}
            defaultCourseId={course.id}
            defaultTopicId={selectedTopicForUpload}
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
          />

          <TaskFormDialog
            mode="create"
            courses={[{ id: course.id, name: course.name, code: course.code }]}
            members={members}
            open={createTaskOpen}
            onOpenChange={setCreateTaskOpen}
          />
        </>
      )}
    </div>
  );
}

function MaterialCard({
  material,
  canManage,
  onDelete,
  formatFileSize,
}: {
  material: MaterialItem;
  canManage: boolean;
  onDelete: (id: string, title: string) => void;
  formatFileSize: (bytes?: number | null) => string | null;
}) {
  const isCloudinary = material.provider === "CLOUDINARY" && material.fileUrl;
  const isExternal = !!material.externalUrl;
  const targetUrl = isCloudinary ? material.fileUrl! : material.externalUrl || "#";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-muted/10 hover:bg-muted/30 transition-all gap-2 text-xs">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono uppercase px-1.5 py-0 h-4">
            {material.materialType}
          </Badge>
          <span className="font-semibold text-foreground text-xs leading-snug">
            {material.title}
          </span>
          {formatFileSize(material.fileSize) && (
            <span className="text-[10px] text-muted-foreground">
              ({formatFileSize(material.fileSize)})
            </span>
          )}
        </div>

        {material.description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {material.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
          <span>Oleh {material.uploadedBy.name || material.uploadedBy.email.split("@")[0]}</span>
          <span>•</span>
          <span>{formatDateIndo(material.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded text-xs transition-colors"
        >
          {isExternal ? (
            <>
              <ExternalLink className="h-3 w-3" />
              Buka Tautan
            </>
          ) : (
            <>
              <Download className="h-3 w-3" />
              Unduh / Buka
            </>
          )}
        </a>

        {canManage && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(material.id, material.title)}
            className="h-7 w-7 text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

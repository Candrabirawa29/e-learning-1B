"use client";

import * as React from "react";
import { createTaskAction, updateTaskAction } from "@/actions/tasks";
import { MemberOption, MemberSelector } from "./MemberSelector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Loader2, Edit3, Link as LinkIcon } from "lucide-react";
import { TaskPriority, TaskTargetType } from "@prisma/client";
import { toast } from "sonner";
import { TaskDetailData } from "./TaskDetailModal";

interface TaskFormDialogProps {
  mode?: "create" | "edit";
  task?: TaskDetailData | null;
  courses: { id: string; name: string; code?: string | null }[];
  members: MemberOption[];
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TaskFormDialog({
  mode = "create",
  task,
  courses,
  members,
  triggerButton,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: TaskFormDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [courseId, setCourseId] = React.useState<string>("none");
  const [priority, setPriority] = React.useState<TaskPriority>(TaskPriority.MEDIUM);
  const [deadline, setDeadline] = React.useState("");
  const [targetType, setTargetType] = React.useState<TaskTargetType>(TaskTargetType.ALL);
  const [selectedAssignees, setSelectedAssignees] = React.useState<string[]>([]);
  const [attachmentUrl, setAttachmentUrl] = React.useState("");
  const [submissionUrl, setSubmissionUrl] = React.useState("");

  React.useEffect(() => {
    if (open) {
      if (mode === "edit" && task) {
        setTitle(task.title || "");
        setDescription(task.description || "");
        setCourseId(task.course?.id || (task as { courseId?: string }).courseId || "none");
        setPriority(task.priority || TaskPriority.MEDIUM);
        if (task.deadline) {
          const d = new Date(task.deadline);
          // Format local datetime string YYYY-MM-DDTHH:mm
          const offset = d.getTimezoneOffset() * 60000;
          const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
          setDeadline(localISOTime);
        } else {
          setDeadline("");
        }
        setTargetType(task.targetType || TaskTargetType.ALL);
        setSelectedAssignees(task.assignments?.map((a) => a.profile.id) || []);
        setAttachmentUrl(task.attachmentUrl || "");
        setSubmissionUrl(task.submissionUrl || "");
      } else {
        setTitle("");
        setDescription("");
        setCourseId("none");
        setPriority(TaskPriority.MEDIUM);
        setDeadline("");
        setTargetType(TaskTargetType.ALL);
        setSelectedAssignees([]);
        setAttachmentUrl("");
        setSubmissionUrl("");
      }
    }
  }, [open, mode, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul tugas wajib diisi.");
      return;
    }

    if (submissionUrl.trim() && !submissionUrl.trim().startsWith("https://")) {
      toast.error("Tautan pengumpulan wajib menggunakan protokol https://");
      return;
    }

    if (attachmentUrl.trim() && !attachmentUrl.trim().startsWith("http://") && !attachmentUrl.trim().startsWith("https://")) {
      toast.error("Tautan lampiran referensi tidak valid.");
      return;
    }

    if (targetType === TaskTargetType.SPECIFIC && selectedAssignees.length === 0) {
      toast.error("Harap pilih setidaknya satu mahasiswa untuk penugasan spesifik.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "edit" && task) {
        await updateTaskAction(task.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          courseId: courseId === "none" ? null : courseId,
          priority,
          deadline: deadline || null,
          targetType,
          assignees: targetType === TaskTargetType.SPECIFIC ? selectedAssignees : [],
          attachmentUrl: attachmentUrl.trim() || undefined,
          submissionUrl: submissionUrl.trim() || undefined,
        });
        toast.success("Tugas berhasil diperbarui!");
      } else {
        await createTaskAction({
          title: title.trim(),
          description: description.trim() || undefined,
          courseId: courseId === "none" ? null : courseId,
          priority,
          deadline: deadline || null,
          targetType,
          assignees: targetType === TaskTargetType.SPECIFIC ? selectedAssignees : [],
          attachmentUrl: attachmentUrl.trim() || undefined,
          submissionUrl: submissionUrl.trim() || undefined,
        });
        toast.success("Tugas baru berhasil dibuat!");
      }

      setOpen(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan tugas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger render={triggerButton as React.ReactElement} />}

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {mode === "edit" ? "Edit Tugas Kelas" : "Buat Tugas Kelas Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {mode === "edit"
                ? "Perbarui rincian tugas, tenggat waktu, atau target penugasan."
                : "Isi formulir berikut untuk menerbitkan tugas ke mahasiswa Kelas 1-B."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-1">
            {/* Judul Tugas */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Judul Tugas <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: Tugas 1 - Normalisasi Database & ERD"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            {/* Mata Kuliah & Prioritas Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Mata Kuliah</Label>
                <Select value={courseId} onValueChange={(val) => { if (val) setCourseId(val); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pilih Mata Kuliah (Opsional)">
                      {courseId === "none" ? "Umum / Tanpa Matkul" : courses.find((c) => c.id === courseId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      -- Umum / Tanpa Matkul --
                    </SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Tingkat Prioritas</Label>
                <Select
                  value={priority}
                  onValueChange={(val) => { if (val) setPriority(val as TaskPriority); }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pilih Prioritas">
                      {priority === TaskPriority.LOW
                        ? "Rendah (Low)"
                        : priority === TaskPriority.MEDIUM
                        ? "Sedang (Medium)"
                        : priority === TaskPriority.HIGH
                        ? "Tinggi (High)"
                        : "Mendesak (Urgent)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TaskPriority.LOW} className="text-xs">
                      Rendah (Low)
                    </SelectItem>
                    <SelectItem value={TaskPriority.MEDIUM} className="text-xs">
                      Sedang (Medium)
                    </SelectItem>
                    <SelectItem value={TaskPriority.HIGH} className="text-xs">
                      Tinggi (High)
                    </SelectItem>
                    <SelectItem value={TaskPriority.URGENT} className="text-xs text-red-600 font-medium">
                      Mendesak (Urgent)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Batas Waktu */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Batas Waktu (Deadline)</Label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Deskripsi / Instruksi */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Instruksi & Deskripsi Tugas</Label>
              <Textarea
                placeholder="Tuliskan format pengerjaan, instruksi file, atau ketentuan lainnya..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Tautan Pengumpulan Tugas (submissionUrl - HTTPS only) */}
            <div className="space-y-1 p-3 bg-muted/30 border rounded-md">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5 text-foreground">
                  <LinkIcon className="h-3.5 w-3.5 text-primary" />
                  URL Pengumpulan Tugas (Wajib HTTPS)
                </Label>
                <span className="text-[10px] text-muted-foreground">Opsional</span>
              </div>
              <Input
                type="url"
                placeholder="https://forms.gle/... atau https://classroom.google.com/..."
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                className="h-8 text-xs bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                Jika diisi, tombol <strong>&quot;Kumpulkan&quot;</strong> akan otomatis muncul pada kartu dan detail tugas mahasiswa.
              </p>
            </div>

            {/* Tautan Lampiran / Referensi */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">URL Referensi / Lampiran Materi (Opsional)</Label>
              <Input
                type="url"
                placeholder="https://drive.google.com/... atau tautan file referensi"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Target Penugasan: ALL vs SPECIFIC */}
            <div className="space-y-2 pt-1 border-t">
              <Label className="text-xs font-medium">Target Penugasan Mahasiswa</Label>
              <RadioGroup
                value={targetType}
                onValueChange={(val) => setTargetType(val as TaskTargetType)}
                className="grid grid-cols-2 gap-3"
              >
                <div className="flex items-center space-x-2 border rounded-md p-2.5 bg-card hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={TaskTargetType.ALL} id="target-all" />
                  <Label htmlFor="target-all" className="cursor-pointer text-xs font-normal">
                    Seluruh Kelas 1-B
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md p-2.5 bg-card hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={TaskTargetType.SPECIFIC} id="target-specific" />
                  <Label htmlFor="target-specific" className="cursor-pointer text-xs font-normal">
                    Mahasiswa Tertentu
                  </Label>
                </div>
              </RadioGroup>

              {targetType === TaskTargetType.SPECIFIC && (
                <div className="pt-2">
                  <MemberSelector
                    members={members}
                    selectedIds={selectedAssignees}
                    onChange={setSelectedAssignees}
                    label="Pilih Mahasiswa Penerima Tugas:"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs h-8"
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 gap-1 font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : mode === "edit" ? (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  Simpan Perubahan
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Buat Tugas
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

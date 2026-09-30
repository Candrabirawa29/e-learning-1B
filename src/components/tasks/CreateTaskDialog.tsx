"use client";

import * as React from "react";
import { createTaskAction } from "@/actions/tasks";
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
import { Plus, Loader2 } from "lucide-react";
import { TaskPriority, TaskTargetType } from "@prisma/client";
import { toast } from "sonner";

interface CreateTaskDialogProps {
  courses: { id: string; name: string; code: string | null }[];
  members: MemberOption[];
  triggerButton?: React.ReactNode;
}

export function CreateTaskDialog({ courses, members, triggerButton }: CreateTaskDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [courseId, setCourseId] = React.useState<string>("none");
  const [priority, setPriority] = React.useState<TaskPriority>(TaskPriority.MEDIUM);
  const [deadline, setDeadline] = React.useState("");
  const [targetType, setTargetType] = React.useState<TaskTargetType>(TaskTargetType.ALL);
  const [selectedAssignees, setSelectedAssignees] = React.useState<string[]>([]);
  const [attachmentUrl, setAttachmentUrl] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul tugas wajib diisi.");
      return;
    }

    if (targetType === TaskTargetType.SPECIFIC && selectedAssignees.length === 0) {
      toast.error("Harap pilih setidaknya satu mahasiswa untuk penugasan spesifik.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTaskAction({
        title: title.trim(),
        description: description.trim() || undefined,
        courseId: courseId === "none" ? null : courseId,
        priority,
        deadline: deadline || null,
        targetType,
        assignees: targetType === TaskTargetType.SPECIFIC ? selectedAssignees : [],
        attachmentUrl: attachmentUrl.trim() || undefined,
      });

      toast.success("Tugas berhasil dibuat!");
      setOpen(false);
      // Reset form
      setTitle("");
      setDescription("");
      setCourseId("none");
      setPriority(TaskPriority.MEDIUM);
      setDeadline("");
      setTargetType(TaskTargetType.ALL);
      setSelectedAssignees([]);
      setAttachmentUrl("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat tugas");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          triggerButton ? (
            (triggerButton as React.ReactElement)
          ) : (
            <Button size="sm" className="h-8 gap-1.5 text-xs font-medium">
              <Plus className="h-3.5 w-3.5" />
              Buat Tugas
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Buat Tugas Baru</DialogTitle>
          <DialogDescription className="text-xs">
            Tambahkan tugas kelas atau penugasan spesifik dengan batas waktu pengumpulan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Judul Tugas */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-medium">
              Judul Tugas <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Contoh: Latihan Mandiri 2: Graf & Pohon"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">
              Deskripsi & Instruksi
            </Label>
            <Textarea
              id="description"
              placeholder="Jelaskan detail pengerjaan, format, atau instruksi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Mata Kuliah & Prioritas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mata Kuliah</Label>
              <Select value={courseId} onValueChange={(val) => { if (val) setCourseId(val); }}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Pilih Mata Kuliah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Umum (Tanpa Mata Kuliah) --</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Prioritas</Label>
              <Select
                value={priority}
                onValueChange={(val) => { if (val) setPriority(val as TaskPriority); }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Prioritas" />
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
                  <SelectItem value={TaskPriority.URGENT} className="text-xs">
                    Mendesak (Urgent)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label htmlFor="deadline" className="text-xs font-medium">
              Batas Waktu (Deadline)
            </Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Target Mahasiswa (DEFAULT: SEMUA MAHASISWA) */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-medium">Target Penugasan</Label>
            <RadioGroup
              value={targetType}
              onValueChange={(val) => setTargetType(val as TaskTargetType)}
              className="flex items-center gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={TaskTargetType.ALL} id="target-all" />
                <Label htmlFor="target-all" className="text-xs font-normal cursor-pointer">
                  Semua mahasiswa (Seluruh Kelas 1-B)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={TaskTargetType.SPECIFIC} id="target-specific" />
                <Label htmlFor="target-specific" className="text-xs font-normal cursor-pointer">
                  Mahasiswa tertentu
                </Label>
              </div>
            </RadioGroup>

            {targetType === TaskTargetType.SPECIFIC && (
              <div className="pt-2">
                <MemberSelector
                  members={members}
                  selectedIds={selectedAssignees}
                  onChange={setSelectedAssignees}
                />
              </div>
            )}
          </div>

          {/* Tautan Tambahan / Lampiran */}
          <div className="space-y-1.5 pt-2 border-t">
            <Label htmlFor="attachmentUrl" className="text-xs font-medium">
              Tautan Lampiran / Referensi (Opsional)
            </Label>
            <Input
              id="attachmentUrl"
              type="url"
              placeholder="https://..."
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs h-8 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSubmitting ? "Menyimpan..." : "Simpan Tugas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

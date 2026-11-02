"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlossaryCard } from "./GlossaryCard";
import { GlossaryFormDialog } from "./GlossaryFormDialog";
import { GlossaryDetailDialog } from "./GlossaryDetailDialog";
import { listGlossaryTerms, getGlossaryTerm, getGlossaryUserTags } from "@/actions/glossary";
import { GlossaryTermDto } from "@/types/glossary";
import {
  BookA,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tag as TagIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface GlossaryPageClientProps {
  courses: Array<{ id: string; name: string; code: string | null }>;
}

export function GlossaryPageClient({ courses }: GlossaryPageClientProps) {
  const [terms, setTerms] = useState<GlossaryTermDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"term_asc" | "term_desc" | "newest" | "oldest">("term_asc");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Dialog State
  const [formOpen, setFormOpen] = useState(false);
  const [termToEdit, setTermToEdit] = useState<GlossaryTermDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTermDto | null>(null);

  // Debounce search 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset ke halaman 1 saat pencarian berubah
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Muat daftar tags milik user
  const fetchTags = useCallback(async () => {
    try {
      const tags = await getGlossaryUserTags();
      setAvailableTags(tags);
    } catch {
      // Abaikan jika gagal memuat tags tambahan
    }
  }, []);

  // Muat data istilah sesuai query
  const loadTerms = useCallback(async () => {
    setIsLoading(true);
    try {
      const verifiedParam =
        verifiedFilter === "verified"
          ? true
          : verifiedFilter === "unverified"
          ? false
          : undefined;

      const res = await listGlossaryTerms({
        search: debouncedSearch.trim() || undefined,
        courseId: selectedCourseId === "all" ? undefined : selectedCourseId,
        tag: selectedTag === "all" ? undefined : selectedTag,
        verified: verifiedParam,
        isArchived: activeTab === "archived",
        sortBy,
        page,
        limit,
      });

      setTerms(res.items);
      setTotalCount(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat istilah kosakata.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedCourseId, selectedTag, verifiedFilter, activeTab, sortBy, page]);

  useEffect(() => {
    startTransition(() => {
      loadTerms();
    });
  }, [loadTerms]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleOpenCreate = () => {
    setTermToEdit(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (term: GlossaryTermDto) => {
    setTermToEdit(term);
    setFormOpen(true);
  };

  const handleCardClick = (term: GlossaryTermDto) => {
    setSelectedTerm(term);
    setDetailOpen(true);
  };

  const handleSelectExisting = async (existingId: string) => {
    try {
      const term = await getGlossaryTerm(existingId);
      if (term) {
        setSelectedTerm(term);
        setDetailOpen(true);
      }
    } catch {
      toast.error("Gagal membuka istilah terkait.");
    }
  };

  const handleSavedTerm = (saved: GlossaryTermDto) => {
    loadTerms();
    fetchTags();
    // Perbarui selectedTerm jika sedang membuka detail istilah yang sama
    if (selectedTerm && selectedTerm.id === saved.id) {
      setSelectedTerm(saved);
    }
  };

  const handleTermUpdatedInDetail = (updated: GlossaryTermDto | null) => {
    loadTerms();
    fetchTags();
    if (updated) {
      setSelectedTerm(updated);
    } else {
      setSelectedTerm(null);
      setDetailOpen(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCourseId("all");
    setSelectedTag("all");
    setVerifiedFilter("all");
    setSortBy("term_asc");
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const isFiltered =
    debouncedSearch.length > 0 ||
    selectedCourseId !== "all" ||
    selectedTag !== "all" ||
    verifiedFilter !== "all";

  // Label pembantu untuk Base UI Select agar menampilkan teks manusia, bukan nilai mentah
  const selectedCourseLabel =
    selectedCourseId === "all"
      ? "Semua Mata Kuliah"
      : courses.find((c) => c.id === selectedCourseId)?.name || "Mata Kuliah";

  const selectedTagLabel =
    selectedTag === "all" ? "Semua Tag" : `#${selectedTag}`;

  const selectedSortLabel =
    sortBy === "term_asc"
      ? "Istilah (A-Z)"
      : sortBy === "term_desc"
      ? "Istilah (Z-A)"
      : sortBy === "newest"
      ? "Terbaru Ditambahkan"
      : "Terlama Ditambahkan";

  const selectedVerifiedLabel =
    verifiedFilter === "all"
      ? "Semua Status"
      : verifiedFilter === "verified"
      ? "Terverifikasi Dosen"
      : "Belum Dicek";

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookA className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Kosakata Pribadi
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kamus istilah dan catatan konsep mandiri untuk penguasaan materi perkuliahan.
          </p>
        </div>

        <Button onClick={handleOpenCreate} size="sm" className="w-full sm:w-auto shadow-xs">
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Istilah
        </Button>
      </div>

      {/* Tabs: Aktif vs Arsip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            if (val === "active" || val === "archived") {
              setActiveTab(val);
              setPage(1);
            }
          }}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-8">
            <TabsTrigger value="active" className="text-xs px-3">
              Kamus Aktif
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs px-3">
              Diarsipkan
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <span className="text-xs text-muted-foreground">
          Total: <strong className="text-foreground">{totalCount}</strong> istilah
        </span>
      </div>

      {/* Toolbar Filter & Pencarian */}
      <div className="rounded-xl border border-border bg-card p-3.5 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {/* Pencarian dengan Debounce */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Cari istilah, catatan, atau tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Mata Kuliah */}
          <div>
            <Select
              value={selectedCourseId}
              onValueChange={(val) => {
                if (val) {
                  setSelectedCourseId(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Pilih Mata Kuliah">
                  <span className="flex items-center gap-1.5 truncate">
                    <BookOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                    {selectedCourseLabel}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Semua Mata Kuliah
                </SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Tag */}
          <div>
            <Select
              value={selectedTag}
              onValueChange={(val) => {
                if (val) {
                  setSelectedTag(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Pilih Tag">
                  <span className="flex items-center gap-1.5 truncate">
                    <TagIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                    {selectedTagLabel}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Semua Tag
                </SelectItem>
                {availableTags.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    #{t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Baris Kedua Filter: Status Verifikasi & Urutan */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
              <Filter className="w-3 h-3" />
              Saring:
            </span>

            {/* Filter Verifikasi */}
            <Select
              value={verifiedFilter}
              onValueChange={(val) => {
                if (val) {
                  setVerifiedFilter(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-7 text-xs w-auto min-w-[130px]">
                <SelectValue placeholder="Status">
                  {selectedVerifiedLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Semua Status
                </SelectItem>
                <SelectItem value="verified" className="text-xs">
                  Terverifikasi Dosen
                </SelectItem>
                <SelectItem value="unverified" className="text-xs">
                  Belum Dicek
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Tombol Reset Filter */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleResetFilters}
                className="text-muted-foreground hover:text-foreground text-[11px]"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset Filter
              </Button>
            )}
          </div>

          {/* Urutan */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[11px]">Urutkan:</span>
            <Select
              value={sortBy}
              onValueChange={(val) => {
                if (val) {
                  setSortBy(val as "term_asc" | "term_desc" | "newest" | "oldest");
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-7 text-xs w-auto min-w-[140px]">
                <SelectValue placeholder="Urutan">
                  {selectedSortLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="term_asc" className="text-xs">
                  Istilah (A-Z)
                </SelectItem>
                <SelectItem value="term_desc" className="text-xs">
                  Istilah (Z-A)
                </SelectItem>
                <SelectItem value="newest" className="text-xs">
                  Terbaru Ditambahkan
                </SelectItem>
                <SelectItem value="oldest" className="text-xs">
                  Terlama Ditambahkan
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Konten Utama: Skeleton / Empty State / Grid Kartu */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      ) : terms.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isFiltered ? <Search className="size-6" /> : <Sparkles className="size-6" />}
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-base font-semibold text-foreground">
              {isFiltered
                ? "Tidak ada istilah yang cocok"
                : activeTab === "archived"
                ? "Tidak ada istilah yang diarsipkan"
                : "Belum ada istilah di kamus Anda"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isFiltered
                ? "Coba ubah kata kunci pencarian atau sesuaikan pilihan filter mata kuliah dan tag."
                : activeTab === "archived"
                ? "Istilah yang Anda arsipkan dari kamus aktif akan muncul di tab ini."
                : "Mulai catat istilah baru, definisi dengan pemahaman pribadi, dan tandai apakah sudah diverifikasi ke materi dosen."}
            </p>
          </div>
          <div>
            {isFiltered ? (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Bersihkan Filter
              </Button>
            ) : activeTab === "active" ? (
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Tambah Istilah Pertama
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        /* Grid Kartu */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {terms.map((term) => (
              <GlossaryCard
                key={term.id}
                term={term}
                onClick={() => handleCardClick(term)}
              />
            ))}
          </div>

          {/* Navigasi Paginasi */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/70 pt-4 text-xs text-muted-foreground">
              <span>
                Halaman <strong className="text-foreground">{page}</strong> dari{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalCount} total)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1 || isLoading}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages || isLoading}
                >
                  Berikutnya
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog Form Tambah / Ubah */}
      <GlossaryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        termToEdit={termToEdit}
        courses={courses}
        onSuccess={handleSavedTerm}
        onSelectExisting={handleSelectExisting}
      />

      {/* Dialog Detail Istilah */}
      <GlossaryDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        term={selectedTerm}
        onEdit={handleOpenEdit}
        onTermUpdated={handleTermUpdatedInDetail}
      />
    </div>
  );
}

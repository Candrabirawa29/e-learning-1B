export interface GlossaryTermDto {
  id: string;
  userId: string;
  term: string;
  termKey: string;
  shortDefinition: string | null;
  body: string;
  courseId: string | null;
  tags: string[];
  source: string | null;
  verified: boolean;
  box: number;
  nextReviewAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

export interface CreateGlossaryTermInput {
  term: string;
  shortDefinition?: string | null;
  body: string;
  courseId?: string | null;
  tags?: string[];
  source?: string | null;
  verified?: boolean;
}

export interface UpdateGlossaryTermInput {
  id: string;
  term?: string;
  shortDefinition?: string | null;
  body?: string;
  courseId?: string | null;
  tags?: string[];
  source?: string | null;
  verified?: boolean;
}

export interface ListGlossaryTermsQuery {
  search?: string;
  courseId?: string;
  tag?: string;
  verified?: boolean;
  isArchived?: boolean;
  sortBy?: "term_asc" | "term_desc" | "newest" | "oldest";
  page?: number;
  limit?: number;
}

export interface ListGlossaryTermsResult {
  items: GlossaryTermDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GlossaryActionResult {
  success: boolean;
  message?: string;
  data?: GlossaryTermDto;
  term?: GlossaryTermDto;
  error?: string;
  existingId?: string;
}

export interface FormData {
  title: string;
  description: string;
  reviewers: Reviewer[];
  expert: Reviewer | null;
  attachments: Attachment[];
}

export interface Reviewer {
  id: string;
  name: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export type FormStatus = 'idle' | 'loading' | 'submitting' | 'success' | 'error';

export interface FormError {
  field: string;
  message: string;
}

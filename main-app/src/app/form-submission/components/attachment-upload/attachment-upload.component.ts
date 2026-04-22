import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormService } from '../../services/form.service';
import { Attachment } from '../../models/form.model';

@Component({
  selector: 'app-attachment-upload',
  templateUrl: './attachment-upload.component.html',
  styleUrls: ['./attachment-upload.component.scss']
})
export class AttachmentUploadComponent {
  @Input() attachments: Attachment[] = [];
  @Output() attachmentsChange = new EventEmitter<Attachment[]>();
  @Output() uploadStatus = new EventEmitter<{ loading: boolean; error: string | null }>();

  isDragging = false;
  allowedTypes = ['.png', '.jpg', '.jpeg', '.doc', '.docx', '.pdf'];
  maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(private formService: FormService) { }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private handleFiles(files: File[]): void {
    files.forEach(file => {
      if (this.isValidFile(file)) {
        this.uploadFile(file);
      }
    });
  }

  private isValidFile(file: File): boolean {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!extension || !this.allowedTypes.includes(extension)) {
      this.uploadStatus.emit({ loading: false, error: '文件类型不支持，请上传 png、word 或 pdf 格式' });
      return false;
    }
    if (file.size > this.maxFileSize) {
      this.uploadStatus.emit({ loading: false, error: '文件大小不能超过 10MB' });
      return false;
    }
    return true;
  }

  private uploadFile(file: File): void {
    this.uploadStatus.emit({ loading: true, error: null });
    this.formService.uploadAttachment(file).subscribe({
      next: (attachment) => {
        const updatedAttachments = [...this.attachments, attachment];
        this.attachmentsChange.emit(updatedAttachments);
        this.uploadStatus.emit({ loading: false, error: null });
      },
      error: () => {
        this.uploadStatus.emit({ loading: false, error: '文件上传失败，请重试' });
      }
    });
  }

  removeAttachment(attachmentId: string): void {
    this.formService.deleteAttachment(attachmentId).subscribe({
      next: () => {
        const updatedAttachments = this.attachments.filter(a => a.id !== attachmentId);
        this.attachmentsChange.emit(updatedAttachments);
      }
    });
  }

  getFileIcon(type: string): string {
    if (type.includes('image')) {
      return 'image';
    } else if (type.includes('word') || type.includes('document')) {
      return 'file-word';
    } else if (type.includes('pdf')) {
      return 'file-pdf';
    }
    return 'file';
  }

  formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
}

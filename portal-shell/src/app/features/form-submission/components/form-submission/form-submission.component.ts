import { Component, OnInit } from '@angular/core';
import { FormService } from '../../services/form.service';
import { FormData, Reviewer, Attachment, FormStatus, FormError } from '../../models/form.model';

@Component({
  selector: 'app-form-submission',
  templateUrl: './form-submission.component.html',
  styleUrls: ['./form-submission.component.scss']
})
export class FormSubmissionComponent implements OnInit {
  formData: FormData = {
    title: '',
    description: '',
    reviewers: [],
    expert: null,
    attachments: []
  };

  reviewers: Reviewer[] = [];
  status: FormStatus = 'idle';
  error: string | null = null;
  uploadError: string | null = null;
  isUploading: boolean = false;

  constructor(private formService: FormService) { }

  ngOnInit(): void {
    this.loadReviewers();
  }

  loadReviewers(): void {
    this.status = 'loading';
    this.formService.getReviewers().subscribe({
      next: (reviewers) => {
        this.reviewers = reviewers;
        this.status = 'idle';
      },
      error: () => {
        this.status = 'error';
        this.error = '加载评审人列表失败';
      }
    });
  }

  onReviewerChange(reviewers: Reviewer[]): void {
    this.formData.reviewers = reviewers;
  }

  onExpertChange(expert: Reviewer | null): void {
    this.formData.expert = expert;
  }

  isReviewerSelected(reviewer: Reviewer): boolean {
    return this.formData.reviewers.some(r => r.id === reviewer.id);
  }

  toggleReviewer(reviewer: Reviewer, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.formData.reviewers = [...this.formData.reviewers, reviewer];
    } else {
      this.formData.reviewers = this.formData.reviewers.filter(r => r.id !== reviewer.id);
    }
  }

  onAttachmentsChange(attachments: Attachment[]): void {
    this.formData.attachments = attachments;
  }

  onUploadStatus(status: { loading: boolean; error: string | null }): void {
    this.isUploading = status.loading;
    this.uploadError = status.error;
  }

  onSubmit(): void {
    if (!this.formData.title) {
      this.error = '请填写标题';
      return;
    }

    if (!this.formData.description) {
      this.error = '请填写描述';
      return;
    }

    this.status = 'submitting';
    this.error = null;

    this.formService.submitForm(this.formData).subscribe({
      next: () => {
        this.status = 'success';
        // 这里可以添加成功后的处理，例如跳转到其他页面
      },
      error: () => {
        this.status = 'error';
        this.error = '表单提交失败，请重试';
      }
    });
  }

  onCancel(): void {
    // 这里可以添加取消后的处理，例如跳转到其他页面
    console.log('取消表单');
  }

  resetForm(): void {
    this.formData = {
      title: '',
      description: '',
      reviewers: [],
      expert: null,
      attachments: []
    };
    this.error = null;
    this.uploadError = null;
  }
}

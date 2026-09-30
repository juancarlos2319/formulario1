import { AfterViewChecked, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedbackService } from './feedback.service';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.css'
})
export class FeedbackComponent implements AfterViewChecked {
  readonly feedback = inject(FeedbackService);

  @ViewChild('confirmDialog') private confirmDialog?: ElementRef<HTMLDialogElement>;

  ngAfterViewChecked(): void {
    const dialog = this.confirmDialog?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  }

  dismissNotice(id: number): void {
    this.feedback.dismiss(id);
  }

  cancelConfirmation(event: Event): void {
    event.preventDefault();
    this.feedback.finishConfirmation(false);
  }

  confirmBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.feedback.finishConfirmation(false);
  }
}

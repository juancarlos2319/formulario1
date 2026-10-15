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

  /** Abre como modal el diálogo nativo cuando aparece una confirmación. */
  ngAfterViewChecked(): void {
    const dialog = this.confirmDialog?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  }

  /** Retira el aviso seleccionado de la lista global. */
  dismissNotice(id: number): void {
    this.feedback.dismiss(id);
  }

  /** Intercepta el cierre nativo y resuelve la confirmación como cancelada. */
  cancelConfirmation(event: Event): void {
    event.preventDefault();
    this.feedback.finishConfirmation(false);
  }

  /** Cancela la confirmación si el clic ocurre fuera del contenido del diálogo. */
  confirmBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.feedback.finishConfirmation(false);
  }
}

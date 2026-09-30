import { Injectable, signal } from '@angular/core';

export type FeedbackKind = 'success' | 'error' | 'warning' | 'info';
export type ConfirmationTone = 'default' | 'danger';

export interface FeedbackNotice {
  id: number;
  message: string;
  kind: FeedbackKind;
}

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  readonly notices = signal<FeedbackNotice[]>([]);
  readonly confirmation = signal<ConfirmationOptions | null>(null);

  private nextNoticeId = 0;
  private resolveConfirmation?: (confirmed: boolean) => void;

  notify(message: string, kind: FeedbackKind = 'info', durationMs = 5000): void {
    const id = ++this.nextNoticeId;
    this.notices.update(notices => [...notices, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this.notices.update(notices => notices.filter(notice => notice.id !== id));
  }

  confirm(options: ConfirmationOptions): Promise<boolean> {
    this.finishConfirmation(false);
    this.confirmation.set(options);
    return new Promise(resolve => this.resolveConfirmation = resolve);
  }

  finishConfirmation(confirmed: boolean): void {
    const resolve = this.resolveConfirmation;
    this.resolveConfirmation = undefined;
    this.confirmation.set(null);
    resolve?.(confirmed);
  }
}

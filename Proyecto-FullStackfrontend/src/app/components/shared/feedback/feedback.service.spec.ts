import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeedbackService);
  });

  it('adds and automatically dismisses a notice', fakeAsync(() => {
    service.notify('Guardado', 'success', 1000);
    expect(service.notices().length).toBe(1);
    expect(service.notices()[0].kind).toBe('success');

    tick(1000);

    expect(service.notices()).toEqual([]);
  }));

  it('resolves a confirmation with the selected result', async () => {
    const result = service.confirm({ title: 'Dar de baja', message: '¿Continuar?' });
    expect(service.confirmation()?.title).toBe('Dar de baja');

    service.finishConfirmation(true);

    await expectAsync(result).toBeResolvedTo(true);
    expect(service.confirmation()).toBeNull();
  });
});

import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from './services/auth.service';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let tokenChanges: Subject<string | null>;

  beforeEach(async () => {
    tokenChanges = new Subject<string | null>();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { tokenChanges$: tokenChanges.asObservable() } }
      ]
    }).compileComponents();
  });

  it('creates the application shell with its router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });

  it('redirects to login when the session expires on a protected route', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/personas');
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    TestBed.createComponent(AppComponent);

    tokenChanges.next(null);

    expect(navigate).toHaveBeenCalledWith(['/inicio'], { replaceUrl: true });
  });
});

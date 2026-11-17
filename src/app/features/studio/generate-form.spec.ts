import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { StudioStore } from '../../state/studio.store';
import { GenerateForm } from './generate-form';

describe('GenerateForm', () => {
  let generateCalls = 0;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    generateCalls = 0;
    await TestBed.configureTestingModule({
      imports: [GenerateForm],
      providers: [
        provideRouter([]),
        {
          provide: ApiService,
          useValue: {
            generate: async () => {
              generateCalls++;
              return { variations: [], provider: 'mock', model: 'm', latencyMs: 1, fallbackUsed: false };
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('shows validation errors and does not generate when required fields are empty', async () => {
    const fixture = TestBed.createComponent(GenerateForm);
    await fixture.whenStable();
    await fixture.componentInstance.submit();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Please enter a product name.');
    expect(el.textContent).toContain('Please choose a category.');
    expect(el.querySelector('#name')?.getAttribute('aria-invalid')).toBe('true');
    expect(generateCalls).toBe(0);
  });

  it('rejects names made only of symbols', async () => {
    const fixture = TestBed.createComponent(GenerateForm);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#name')!;
    input.value = '!!!***';
    input.dispatchEvent(new Event('input'));
    await fixture.componentInstance.submit();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Use letters or numbers');
    expect(generateCalls).toBe(0);
  });

  it('generates when name and category are valid', async () => {
    const fixture = TestBed.createComponent(GenerateForm);
    await fixture.whenStable();
    TestBed.inject(StudioStore).patchForm({ name: 'Brass lamp', category: 'home' });
    await fixture.whenStable();
    await fixture.componentInstance.submit();
    expect(generateCalls).toBe(1);
  });
});

import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TEMPLATE_IDS, type TemplateId } from '../../../../shared/constants';
import { CardRepository } from '../../core/card-repository.service';
import { ShortcutsService } from '../../layout/shortcuts.service';
import { StudioStore } from '../../state/studio.store';
import { CardStage } from './card-stage';
import { DetailsPanel } from './details-panel';
import { GenerateForm } from './generate-form';

@Component({
  selector: 'app-studio-page',
  // Prerendered for a fast first paint, then rendered fresh in the browser so a restored
  // draft or signed-in state never conflicts with the static HTML.
  host: { ngSkipHydration: 'true' },
  imports: [GenerateForm, CardStage, DetailsPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">Studio</h1>
    <div class="grid gap-5 xl:grid-cols-[minmax(20rem,25rem)_minmax(0,1fr)_minmax(19rem,23rem)] lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
      <div class="lg:sticky lg:top-24 lg:self-start">
        <app-generate-form />
      </div>
      <app-card-stage />
      <div class="lg:col-span-2 xl:col-span-1 xl:sticky xl:top-24 xl:self-start">
        <app-details-panel />
      </div>
    </div>
  `,
})
export default class StudioPage implements OnInit {
  /** ?new=1 starts a fresh card, ?template=luxe preselects a template, ?card=<id> opens a saved card. */
  readonly new = input<string>();
  readonly template = input<string>();
  readonly card = input<string>();

  private readonly store = inject(StudioStore);
  private readonly repo = inject(CardRepository);
  private readonly shortcuts = inject(ShortcutsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly form = viewChild(GenerateForm);

  ngOnInit(): void {
    if (this.new()) this.store.reset();
    const t = this.template();
    if (t && (TEMPLATE_IDS as string[]).includes(t)) this.store.setTemplate(t as TemplateId);
    const id = this.card();
    if (id) {
      const found = this.repo.get(id);
      if (found) this.store.load(found);
    }
    if (this.new() || t || id) void this.router.navigate([], { queryParams: {}, replaceUrl: true });

    this.shortcuts.studioHandlers.set({
      generate: () => void this.form()?.submit(),
      undo: () => this.store.undo(),
      redo: () => this.store.redo(),
      save: () => void this.store.save(),
    });
    this.destroyRef.onDestroy(() => this.shortcuts.studioHandlers.set(null));
  }
}

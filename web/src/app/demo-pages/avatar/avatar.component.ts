import { Component, AfterViewInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

export type StepKey =
  | 'accessory'
  | 'top'
  | 'clothing'
  | 'face'
  | 'skinColor';

@Component({
  selector: 'app-avatar',
  standalone: false,
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.css']
})
export class AvatarComponent implements AfterViewInit {
  currentPhase: 'customize' | 'activity' = 'customize';
  seed: string = 'kid';
  avatarDataUri: string = '';
  currentPreviewUri: string = '';
  currentOptionIndex: number = 0;

  isDragging: boolean = false;
  private dragStartX: number | null = null;
  private dragLastX: number | null = null;
  private dragTotalDx: number = 0;
  private readonly swipeThresholdPx: number = 40;

  isAnimating: boolean = false;
  prevPreviewUri: string | null = null;
  nextPreviewUri: string | null = null;
  currentTransform: string = 'translateX(0px)';
  prevTransform: string = 'translateX(0px)';
  nextTransform: string = 'translateX(0px)';
  prev2PreviewUri: string | null = null;
  next2PreviewUri: string | null = null;
  prev2Transform: string = 'translateX(0px)';
  next2Transform: string = 'translateX(0px)';
  private containerWidth: number = 0;
  private readonly animationDurationMs: number = 250;
  private readonly neighborOffsetRatio: number = 0.30;

  private style = avataaars;

  currentStepIndex: number = 0;
  steps: Array<{ key: StepKey; title: string; options: { label: string; value: any }[] }> = [];
  stepIconMap: Record<StepKey, string> = {
    skinColor: '🧴',
    top: '🎩',
    clothing: '👕',
    face: '🙂',
    accessory: '🕶️',
  } as const;

  private accessoryOptions = [
    { label: 'None', value: null },
    { label: 'Round', value: 'round' },
    { label: 'Wayfarers', value: 'wayfarers' },
    { label: 'Sunglasses', value: 'sunglasses' },
    { label: 'Rx 1', value: 'prescription01' },
    { label: 'Rx 2', value: 'prescription02' },
    { label: 'Kurt', value: 'kurt' },
  ];
  private topOptions: Array<{ label: string; value: any }> = [];
  private hairColorOptions = [
    { label: 'Black', value: '000000' },
    { label: 'Dark', value: '2C1B18' },
    { label: 'Brown', value: 'A55728' },
    { label: 'Light', value: 'B58143' },
    { label: 'None', value: null },
  ];
  private clothingOptions: Array<{ label: string; value: any }> = [];
  private clothesColorOptions = [
    { label: 'Black', value: '111827' },
    { label: 'Gray', value: '374151' },
    { label: 'Blue', value: '3B82F6' },
    { label: 'Indigo', value: '6366F1' },
    { label: 'Orange', value: 'F59E0B' },
    { label: 'Pink', value: 'F472B6' },
    { label: 'Green', value: '10B981' },
    { label: 'Cyan', value: '22D3EE' },
    { label: 'Yellow', value: 'FDE68A' },
    { label: 'Red', value: 'EF4444' },
  ];
  private eyesOptions = [
    { label: 'Default', value: 'default' },
    { label: 'Happy', value: 'happy' },
    { label: 'Wink', value: 'wink' },
    { label: 'Squint', value: 'squint' },
    { label: 'Surprised', value: 'surprised' },
    { label: 'Hearts', value: 'hearts' },
  ];
  private eyebrowsOptions = [
    { label: 'Default', value: 'default' },
    { label: 'Angry', value: 'angry' },
    { label: 'Raised', value: 'raisedExcited' },
    { label: 'Sad', value: 'sadConcerned' },
    { label: 'Up/Down', value: 'upDown' },
  ];
  private mouthOptions = [
    { label: 'Smile', value: 'smile' },
    { label: 'Neutral', value: 'default' },
    { label: 'Scream', value: 'screamOpen' },
    { label: 'Grimace', value: 'grimace' },
    { label: 'Twinkle', value: 'twinkle' },
  ];
  private skinOptions = [
    { label: 'Fair', value: 'F8D4B8' },
    { label: 'Light', value: 'F2C7A5' },
    { label: 'Medium', value: 'E0A39A' },
    { label: 'Tan', value: 'C68642' },
    { label: 'Dark', value: '8D5524' },
  ];

  private faceOptions: Array<{ label: string; value: { eyes: string; eyebrows: string; mouth: string } }> = [];

  constructor() {
    const hairStyles = [
      { key: 'shortFlat', label: 'Short Flat' },
      { key: 'shortRound', label: 'Short Round' },
      { key: 'shortWaved', label: 'Short Waved' },
      { key: 'bob', label: 'Bob' },
      { key: 'bun', label: 'Bun' },
      { key: 'curly', label: 'Curly' },
      { key: 'longButNotTooLong', label: 'Long' },
    ];
    const hatStyles = [
      { key: 'hat', label: 'Hat' },
      { key: 'winterHat1', label: 'Winter Hat 1' },
      { key: 'winterHat02', label: 'Winter Hat 2' },
      { key: 'winterHat03', label: 'Winter Hat 3' },
      { key: 'winterHat04', label: 'Winter Hat 4' },
    ];
    const buildTopLabel = (colorLabel: string, styleLabel: string) => `${colorLabel} - ${styleLabel}`;
    this.topOptions = this.hairColorOptions
      .filter(c => !!c.value)
      .flatMap(c => [
        ...hairStyles.map(style => ({ label: buildTopLabel(c.label, style.label), value: { top: style.key, hairColor: c.value } })),
        ...hatStyles.map(style => ({ label: buildTopLabel(c.label, style.label), value: { top: style.key, hairColor: c.value } })),
      ]);

    const clothingStyles = [
      { key: 'hoodie', label: 'Hoodie' },
      { key: 'shirtCrewNeck', label: 'Crew Neck' },
      { key: 'shirtVNeck', label: 'V-Neck' },
      { key: 'collarAndSweater', label: 'Collar & Sweater' },
      { key: 'blazerAndShirt', label: 'Blazer & Shirt' },
    ];
    const buildClothingLabel = (colorLabel: string, styleLabel: string) => `${colorLabel} - ${styleLabel}`;
    this.clothingOptions = this.clothesColorOptions.flatMap(c =>
      clothingStyles.map(style => ({ label: buildClothingLabel(c.label, style.label), value: { clothing: style.key, clothesColor: c.value } }))
    );

    const buildFaceLabel = (eyesLabel: string, browsLabel: string, mouthLabel: string) => `${eyesLabel} - ${browsLabel} - ${mouthLabel}`;
    this.faceOptions = this.eyesOptions.flatMap(e =>
      this.eyebrowsOptions.flatMap(b =>
        this.mouthOptions.map(m => ({ label: buildFaceLabel(e.label, b.label, m.label), value: { eyes: e.value, eyebrows: b.value, mouth: m.value } }))
      )
    );

    this.steps = [
      { key: 'skinColor', title: 'Skin', options: this.skinOptions },
      { key: 'top', title: 'Hair', options: this.topOptions },
      { key: 'clothing', title: 'Clothing', options: this.clothingOptions },
      { key: 'face', title: 'Face', options: this.faceOptions },
      { key: 'accessory', title: 'Glasses', options: this.accessoryOptions },
    ];
  }

  @ViewChild('kidNav') kidNavRef?: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    this.generateAvatar();
    this.scheduleBaselineSetup();
    this.scrollActiveNavIntoView();
  }

  get currentStep() {
    return this.steps[this.currentStepIndex];
  }

  getProgressPercentage(): number {
    const totalSteps = this.steps.length;
    const currentStep = this.currentStepIndex;
    // Start at 20% and fill to 100% over all steps
    const startProgress = 20;
    const endProgress = 100;
    const progressRange = endProgress - startProgress;
    return startProgress + (currentStep / (totalSteps - 1)) * progressRange;
  }

  getButtonText(): string {
    return this.currentStepIndex === this.steps.length - 1 ? 'Finalize' : 'Select';
  }

  nextStep(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.updatePreviewForCurrentStep();
      this.prepareNeighbors();
      const width = this.getCanvasWidth();
      this.setBaselineTransforms(width);
      this.scrollActiveNavIntoView();
    }
  }

  prevStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.updatePreviewForCurrentStep();
      this.prepareNeighbors();
      const width = this.getCanvasWidth();
      this.setBaselineTransforms(width);
      this.scrollActiveNavIntoView();
    }
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStepIndex = index;
    this.updatePreviewForCurrentStep();
    this.prepareNeighbors();
    const width = this.getCanvasWidth();
    this.setBaselineTransforms(width);
    this.scrollActiveNavIntoView();
  }

  private scrollActiveNavIntoView(): void {
    const container = this.kidNavRef?.nativeElement;
    if (!container) return;
    const active = container.querySelector('.nav-btn.active') as HTMLElement | null;
    if (!active) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const overflowLeft = activeRect.left < containerRect.left + 12;
    const overflowRight = activeRect.right > containerRect.right - 12;
    if (overflowLeft || overflowRight) {
      const delta = activeRect.left - containerRect.left - (containerRect.width - activeRect.width) / 2;
      container.scrollBy({ left: delta, behavior: 'smooth' });
    }
  }

  selectOption(key: StepKey, value: any): void {
    switch (key) {
      case 'accessory':
        this.selectedAccessory = value;
        break;
      case 'top':
        if (value && typeof value === 'object') {
          this.selectedTop = value.top;
          this.hairColor = value.hairColor ?? this.hairColor;
        } else {
          this.selectedTop = value;
        }
        break;
      case 'clothing':
        if (value && typeof value === 'object') {
          this.selectedClothing = value.clothing;
          this.clothesColor = value.clothesColor ?? this.clothesColor;
        } else {
          this.selectedClothing = value;
        }
        break;
      case 'face':
        if (value && typeof value === 'object') {
          this.eyes = value.eyes;
          this.eyebrows = value.eyebrows;
          this.mouth = value.mouth;
        }
        break;
      case 'skinColor':
        this.skinColor = value;
        break;
    }
    this.generateAvatar();
  }

  isSelected(key: StepKey, value: any): boolean {
    switch (key) {
      case 'accessory': return this.selectedAccessory === value;
      case 'top':
        if (value && typeof value === 'object') {
          return this.selectedTop === value.top && this.hairColor === value.hairColor;
        }
        return this.selectedTop === value;
      case 'clothing':
        if (value && typeof value === 'object') {
          return this.selectedClothing === value.clothing && this.clothesColor === value.clothesColor;
        }
        return this.selectedClothing === value;
      case 'face':
        return value && typeof value === 'object'
          ? this.eyes === value.eyes && this.eyebrows === value.eyebrows && this.mouth === value.mouth
          : false;
      case 'skinColor': return this.skinColor === value;
    }
  }

  onSeedInput(value: string): void {
    this.seed = value;
    this.generateAvatar();
  }

  saveAvatar(): void {
    // eslint-disable-next-line no-console
    console.log('Avatar saved', {
      style: 'avataaars',
      seed: this.seed,
    });
    alert('Avatar saved! Micro-quest coming soon.');
  }

  generateAvatar(): void {
    const effectiveSeed = this.seed;
    const options: any = this.getStyleOptions();
    const avatar = createAvatar(this.style, { seed: effectiveSeed, ...options });
    this.avatarDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(avatar.toString())}`;
  }

  getPreviewAvatar(
    value: any,
    type: 'accessory' | 'top' | 'clothing' | 'face' | 'skinColor'
  ): string {
    const baseOptions: any = this.getStyleOptions();
    const overrides: any = {};

    switch (type) {
      case 'accessory':
        overrides.accessories = value ? [value] : undefined;
        overrides.accessoriesProbability = value ? 100 : 0;
        break;
      case 'top':
        if (value && typeof value === 'object') {
          overrides.top = [value.top];
          if (value.hairColor) {
            overrides.hairColor = [value.hairColor];
            if (value.top === 'hat' || (typeof value.top === 'string' && value.top.startsWith('winterHat'))) {
              overrides.hatColor = [value.hairColor];
            }
          }
        } else {
          overrides.top = [value];
          if (value === 'hat' || (typeof value === 'string' && value.startsWith('winterHat'))) {
            overrides.hatColor = this.hairColor ? [this.hairColor] : undefined;
          }
        }
        break;
      case 'clothing':
        if (value && typeof value === 'object') {
          overrides.clothing = value.clothing ? [value.clothing] : undefined;
          overrides.clothesColor = value.clothesColor ? [value.clothesColor] : undefined;
        } else {
          overrides.clothing = value ? [value] : undefined;
        }
        break;
      case 'face':
        if (value && typeof value === 'object') {
          overrides.eyes = value.eyes ? [value.eyes] : undefined;
          overrides.eyebrows = value.eyebrows ? [value.eyebrows] : undefined;
          overrides.mouth = value.mouth ? [value.mouth] : undefined;
        }
        break;
      case 'skinColor':
        overrides.skinColor = value ? [value] : undefined;
        break;
      default:
        break;
    }

    const preview = createAvatar(this.style, { seed: this.seed, ...baseOptions, ...overrides });
    return `data:image/svg+xml;utf8,${encodeURIComponent(preview.toString())}`;
  }

  private getStyleOptions(): any {
    const top = this.selectedTop ?? 'shortFlat';
    const opts: any = {
      top: [top],
      accessories: this.selectedAccessory ? [this.selectedAccessory] : undefined,
      accessoriesProbability: this.selectedAccessory ? 100 : 0,
      clothing: this.selectedClothing ? [this.selectedClothing] : undefined,
      eyes: this.eyes ? [this.eyes] : undefined,
      eyebrows: this.eyebrows ? [this.eyebrows] : undefined,
      mouth: this.mouth ? [this.mouth] : undefined,
      hairColor: this.hairColor ? [this.hairColor] : undefined,
      clothesColor: this.clothesColor ? [this.clothesColor] : undefined,
      skinColor: this.skinColor ? [this.skinColor] : undefined,
    };
    if (top === 'hat' || top.startsWith('winterHat')) {
      opts.hatColor = this.hairColor ? [this.hairColor] : undefined;
    }
    return opts;
  }

  selectedAccessory: 'kurt' | 'prescription01' | 'prescription02' | 'round' | 'sunglasses' | 'wayfarers' | null = null;
  selectedTop: 'hat' | 'winterHat1' | 'winterHat02' | 'winterHat03' | 'winterHat04' | 'shortFlat' | 'shortRound' | 'shortWaved' | 'bob' | 'bun' | 'curly' | 'longButNotTooLong' | 'shaggy' | 'shortCurly' | null = 'shortFlat';
  selectedClothing: 'hoodie' | 'graphicShirt' | 'shirtCrewNeck' | 'shirtVNeck' | 'collarAndSweater' | 'blazerAndShirt' | null = 'hoodie';
  hairColor: string | null = '000000';
  clothesColor: string | null = '3B82F6';
  skinColor: string | null = 'F2C7A5';

  eyes: 'closed' | 'cry' | 'default' | 'eyeRoll' | 'happy' | 'hearts' | 'side' | 'squint' | 'surprised' | 'winkWacky' | 'wink' | 'xDizzy' | null = 'default';
  eyebrows: 'angryNatural' | 'defaultNatural' | 'flatNatural' | 'frownNatural' | 'raisedExcitedNatural' | 'sadConcernedNatural' | 'unibrowNatural' | 'upDownNatural' | 'angry' | 'default' | 'raisedExcited' | 'sadConcerned' | 'upDown' | null = 'default';
  mouth: 'concerned' | 'default' | 'disbelief' | 'eating' | 'grimace' | 'sad' | 'screamOpen' | 'serious' | 'smile' | 'tongue' | 'twinkle' | 'vomit' | null = 'smile';

  prevOption(): void {
    this.slideToNeighbor('prev');
  }

  nextOption(): void {
    this.slideToNeighbor('next');
  }

  applyCurrentOption(): void {
    const options = this.currentStep.options;
    if (!options || options.length === 0) return;
    const chosen = options[this.currentOptionIndex];
    this.selectOption(this.currentStep.key, chosen.value);
    
    // If this is the last step, go to activity phase
    if (this.currentStepIndex === this.steps.length - 1) {
      this.currentPhase = 'activity';
    } else {
      this.nextStep();
    }
  }

  private getSelectedValueForKey(key: StepKey): any {
    switch (key) {
      case 'accessory': return this.selectedAccessory;
      case 'top': return { top: this.selectedTop, hairColor: this.hairColor };
      case 'clothing': return { clothing: this.selectedClothing, clothesColor: this.clothesColor };
      case 'face': return { eyes: this.eyes, eyebrows: this.eyebrows, mouth: this.mouth };
      case 'skinColor': return this.skinColor;
    }
  }

  private updatePreviewForCurrentStep(): void {
    const options = this.currentStep.options;
    if (!options || options.length === 0) {
      this.currentPreviewUri = this.avatarDataUri;
      this.currentOptionIndex = 0;
      return;
    }
    const key = this.currentStep.key;
    let idx = 0;
    if (key === 'top') {
      idx = options.findIndex(o => {
        const v = o.value;
        return v && typeof v === 'object'
          ? v.top === this.selectedTop && v.hairColor === this.hairColor
          : v === this.selectedTop;
      });
    } else if (key === 'clothing') {
      idx = options.findIndex(o => {
        const v = o.value;
        return v && typeof v === 'object'
          ? v.clothing === this.selectedClothing && v.clothesColor === this.clothesColor
          : v === this.selectedClothing;
      });
    } else if (key === 'face') {
      idx = options.findIndex(o => {
        const v = o.value;
        return v && typeof v === 'object'
          ? v.eyes === this.eyes && v.eyebrows === this.eyebrows && v.mouth === this.mouth
          : false;
      });
    } else {
      const selectedValue = this.getSelectedValueForKey(key);
      idx = options.findIndex(o => o.value === selectedValue);
    }
    if (idx < 0) idx = 0;
    this.currentOptionIndex = idx;
    this.currentPreviewUri = this.getPreviewAvatar(options[this.currentOptionIndex].value, this.currentStep.key);
  }

  onPointerDown(event: PointerEvent): void {
    (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragLastX = event.clientX;
    this.dragTotalDx = 0;
    const target = (event.currentTarget as HTMLElement) || (event.target as HTMLElement);
    this.containerWidth = target?.clientWidth || this.getCanvasWidth();
    this.prepareNeighbors();
    this.currentTransform = 'translateX(0px)';
    const width = this.containerWidth || this.getCanvasWidth();
    this.setBaselineTransforms(width);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging || this.dragLastX === null) return;
    const dx = event.clientX - this.dragLastX;
    this.dragLastX = event.clientX;
    this.dragTotalDx += dx;
    const width = this.containerWidth || this.getCanvasWidth();
    this.shiftCenterWhileDragging(width);
    const offset = this.computeOffset(width);
    this.currentTransform = `translateX(${this.dragTotalDx}px)`;
    this.prevTransform = `translateX(${ -offset + this.dragTotalDx }px)`;
    this.nextTransform = `translateX(${  offset + this.dragTotalDx }px)`;
    this.prev2Transform = `translateX(${ -2 * offset + this.dragTotalDx }px)`;
    this.next2Transform = `translateX(${  2 * offset + this.dragTotalDx }px)`;
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    const totalDx = this.dragTotalDx;
    this.dragStartX = null;
    this.dragLastX = null;
    this.dragTotalDx = 0;
    const width = this.containerWidth || this.getCanvasWidth();
    const offset = this.computeOffset(width);
    const rawSteps = Math.round(totalDx / offset);
    const steps = Math.max(-2, Math.min(2, rawSteps));
    if (Math.abs(steps) >= 1) {
      this.finishSlideWithSteps(steps, width);
    } else {
      this.isAnimating = true;
      this.currentTransform = 'translateX(0px)';
      this.prevTransform = `translateX(${-offset}px)`;
      this.nextTransform = `translateX(${ offset }px)`;
      this.prev2Transform = `translateX(${-2 * offset}px)`;
      this.next2Transform = `translateX(${ 2 * offset }px)`;
      window.setTimeout(() => {
        this.isAnimating = false;
        this.currentTransform = 'translateX(0px)';
        this.prevTransform = `translateX(${-offset}px)`;
        this.nextTransform = `translateX(${ offset }px)`;
        this.prev2Transform = `translateX(${-2 * offset}px)`;
        this.next2Transform = `translateX(${ 2 * offset }px)`;
      }, this.animationDurationMs);
    }
  }

  private slideToNeighbor(direction: 'next' | 'prev'): void {
    if (this.isAnimating) return;
    const width = this.getCanvasWidth();
    const offset = this.computeOffset(width);
    const neighborIdx = this.getNeighborIndex(direction);
    const options = this.currentStep.options;
    if (!options || options.length === 0) return;
    this.prepareNeighbors();
    this.currentTransform = 'translateX(0px)';
    this.prevTransform = `translateX(${-offset}px)`;
    this.nextTransform = `translateX(${ offset }px)`;
    this.prev2Transform = `translateX(${-2 * offset}px)`;
    this.next2Transform = `translateX(${ 2 * offset }px)`;
    this.isAnimating = true;
    window.setTimeout(() => {
      this.currentTransform = `translateX(${direction === 'next' ? -offset : offset }px)`;
      if (direction === 'next') {
        this.nextTransform = 'translateX(0px)';
      } else {
        this.prevTransform = 'translateX(0px)';
      }
      window.setTimeout(() => {
        this.currentOptionIndex = neighborIdx;
        this.updateCurrentFromIndex();
        this.prepareNeighbors();
        this.currentTransform = 'translateX(0px)';
        this.prevTransform = `translateX(${-offset}px)`;
        this.nextTransform = `translateX(${ offset }px)`;
        this.prev2Transform = `translateX(${-2 * offset}px)`;
        this.next2Transform = `translateX(${ 2 * offset }px)`;
        this.isAnimating = false;
      }, this.animationDurationMs);
    }, 0);
  }

  private finishSlideWithSteps(steps: number, width: number): void {
    this.isAnimating = true;
    const offset = this.computeOffset(width);
    this.prev2Transform = `translateX(${ (-2 + steps) * offset }px)`;
    this.prevTransform  = `translateX(${ (-1 + steps) * offset }px)`;
    this.currentTransform = `translateX(${ (0 + steps) * offset }px)`;
    this.nextTransform  = `translateX(${ (1 + steps) * offset }px)`;
    this.next2Transform = `translateX(${ (2 + steps) * offset }px)`;
    window.setTimeout(() => {
      const len = (this.currentStep.options || []).length;
      const delta = -steps;
      this.currentOptionIndex = ((this.currentOptionIndex + delta) % len + len) % len;
      this.updateCurrentFromIndex();
      this.prepareNeighbors();
      this.currentTransform = 'translateX(0px)';
      this.prevTransform = `translateX(${-offset}px)`;
      this.nextTransform = `translateX(${ offset }px)`;
      this.prev2Transform = `translateX(${-2 * offset}px)`;
      this.next2Transform = `translateX(${ 2 * offset }px)`;
      this.isAnimating = false;
    }, this.animationDurationMs);
  }

  private getNeighborIndex(direction: 'next' | 'prev'): number {
    const options = this.currentStep.options || [];
    const len = options.length;
    if (len === 0) return 0;
    const delta = direction === 'next' ? 1 : -1;
    return (this.currentOptionIndex + delta + len) % len;
  }

  private updateCurrentFromIndex(): void {
    const options = this.currentStep.options;
    if (!options || options.length === 0) return;
    this.currentPreviewUri = this.getPreviewAvatar(options[this.currentOptionIndex].value, this.currentStep.key);
  }

  private prepareNeighbors(): void {
    const options = this.currentStep.options;
    if (!options || options.length === 0) {
      this.prevPreviewUri = null;
      this.nextPreviewUri = null;
      this.prev2PreviewUri = null;
      this.next2PreviewUri = null;
      return;
    }
    const prevIdx = this.getNeighborIndex('prev');
    const nextIdx = this.getNeighborIndex('next');
    this.prevPreviewUri = this.getPreviewAvatar(options[prevIdx].value, this.currentStep.key);
    this.nextPreviewUri = this.getPreviewAvatar(options[nextIdx].value, this.currentStep.key);
    const prev2Idx = (prevIdx - 1 + options.length) % options.length;
    const next2Idx = (nextIdx + 1) % options.length;
    this.prev2PreviewUri = this.getPreviewAvatar(options[prev2Idx].value, this.currentStep.key);
    this.next2PreviewUri = this.getPreviewAvatar(options[next2Idx].value, this.currentStep.key);
  }

  private getCanvasWidth(): number {
    const el = document.querySelector('.avatar-canvas') as HTMLElement | null;
    return el?.clientWidth || 600;
  }

  private scheduleBaselineSetup(): void {
    requestAnimationFrame(() => {
      this.updatePreviewForCurrentStep();
      this.prepareNeighbors();
      const width = this.getCanvasWidth();
      this.setBaselineTransforms(width);
    });
  }

  private computeOffset(width: number): number {
    return Math.round(width * this.neighborOffsetRatio);
  }

  private shiftCenterWhileDragging(width: number): void {
    const offset = this.computeOffset(width);
    const options = this.currentStep.options || [];
    if (options.length === 0) return;
    while (this.dragTotalDx >= offset) {
      this.currentOptionIndex = this.getNeighborIndex('prev');
      this.updateCurrentFromIndex();
      this.prepareNeighbors();
      this.dragTotalDx -= offset;
    }
    while (this.dragTotalDx <= -offset) {
      this.currentOptionIndex = this.getNeighborIndex('next');
      this.updateCurrentFromIndex();
      this.prepareNeighbors();
      this.dragTotalDx += offset;
    }
  }

  private setBaselineTransforms(width: number): void {
    const offset = this.computeOffset(width);
    this.currentTransform = 'translateX(0px)';
    this.prevTransform = `translateX(${-offset}px)`;
    this.nextTransform = `translateX(${ offset }px)`;
    this.prev2Transform = `translateX(${-2 * offset}px)`;
    this.next2Transform = `translateX(${ 2 * offset }px)`;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const width = this.getCanvasWidth();
    this.setBaselineTransforms(width);
  }
}



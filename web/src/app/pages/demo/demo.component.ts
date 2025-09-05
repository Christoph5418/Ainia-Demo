import { Component } from '@angular/core';

@Component({
  selector: 'app-demo',
  templateUrl: './demo.component.html',
  styleUrls: ['./demo.component.css']
})
export class DemoComponent {
  currentPhase: 'start' | 'customize' = 'start';

  start(): void {
    this.currentPhase = 'customize';
  }
}

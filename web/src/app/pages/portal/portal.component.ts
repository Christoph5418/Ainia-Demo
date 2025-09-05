import { Component } from '@angular/core';

interface RecentEvent {
  time: string;
  title: string;
  meta?: string;
  badge: 'success' | 'info' | 'neutral';
  avatarUrl?: string;
}

@Component({
  selector: 'app-portal',
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.css']
})
export class PortalComponent {
  events: RecentEvent[] = [
    {
      time: '10:20',
      title: 'Finished the demo successfully',
      meta: 'All steps completed • Ready for next session',
      badge: 'success'
    },
    {
      time: '10:12',
      title: 'Created a custom avatar',
      meta: 'Seed: kid • Style: Avataaars',
      badge: 'info',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kid&radius=50&backgroundColor=b6e3f4'
    },
    {
      time: '10:00',
      title: 'Signed up for Ainia demo',
      meta: 'Parent consent confirmed • Email verified',
      badge: 'success'
    }
  ];

  onDeleteEvents(): void {
    this.events = [];
  }

  onExportEvents(): void {
    const blob = new Blob([JSON.stringify(this.events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recent-events.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}

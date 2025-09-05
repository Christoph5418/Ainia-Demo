import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { PortalComponent } from './pages/portal/portal.component';
import { DemoComponent } from './pages/demo/demo.component';
import { ActivityComponent } from './demo-pages/activity/activity.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'portal', component: PortalComponent },
  { path: 'demo', component: DemoComponent },
  { path: 'activity', component: ActivityComponent },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

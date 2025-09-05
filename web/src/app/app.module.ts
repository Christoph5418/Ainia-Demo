import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { PortalComponent } from './pages/portal/portal.component';
import { DemoComponent } from './pages/demo/demo.component';
import { AvatarComponent } from './demo-pages/avatar/avatar.component';
import { ActivityComponent } from './demo-pages/activity/activity.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    PortalComponent,
    DemoComponent,
    AvatarComponent,
    ActivityComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { DoBootstrap, Injector, NgModule } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { ErrorService, SunbirdPlayerSdkModule, PLAYER_CONFIG } from '@project-sunbird/sunbird-player-sdk-v9';
import { QuestionCursor } from '@project-sunbird/sunbird-quml-player-v9';
import { VideoPlayerComponent } from '../../../sunbird-video-player/src/lib/components/video-player/video-player.component';
import { SunbirdVideoPlayerComponent } from '../../../sunbird-video-player/src/lib/sunbird-video-player.component';
import { QCImplementationService } from './QCImplementationService';

@NgModule({
    declarations: [
        SunbirdVideoPlayerComponent,
        VideoPlayerComponent
    ],
    imports: [
        BrowserModule,
        CommonModule,
        FormsModule,
        HttpClientModule,
        SunbirdPlayerSdkModule,
    ],
    providers: [ErrorService,
        { provide: QuestionCursor, useClass: QCImplementationService },
      { provide: PLAYER_CONFIG, useValue: { contentCompatibilityLevel: 5 } }
    ]
})
export class AppModule implements DoBootstrap {
  constructor(private injector: Injector) { }
  ngDoBootstrap() {
    const customElement = createCustomElement(SunbirdVideoPlayerComponent, { injector: this.injector });
    customElements.define('sunbird-video-player', customElement);
  }
}


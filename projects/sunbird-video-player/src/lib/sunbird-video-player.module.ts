import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SunbirdPlayerSdkModule  } from '@project-sunbird/sunbird-player-sdk-v9';
import { SunbirdVideoPlayerComponent } from './sunbird-video-player.component';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { ErrorService } from '@project-sunbird/sunbird-player-sdk-v9';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [SunbirdVideoPlayerComponent, VideoPlayerComponent],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    SunbirdPlayerSdkModule,
  ],
  providers: [ErrorService],
  exports: [SunbirdVideoPlayerComponent , SunbirdPlayerSdkModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SunbirdVideoPlayerModule { }

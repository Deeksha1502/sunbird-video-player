import {
  ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges,
  HostListener, ElementRef, ViewChild, AfterViewInit, Renderer2, OnDestroy
} from '@angular/core';
import { ErrorService, errorCode, errorMessage, ISideBarEvent } from '@project-sunbird/sunbird-player-sdk-v9';

import { PlayerConfig } from './playerInterfaces';
import { IAction } from './playerInterfaces';
import { ViewerService } from './services/viewer.service';
import { SunbirdVideoPlayerService } from './sunbird-video-player.service';
@Component({
  // eslint-disable-next-line @angular-eslint/prefer-standalone
  standalone: false,
  selector: 'sunbird-video-player',
  templateUrl: './sunbird-video-player.component.html',
  styleUrls: ['./sunbird-video-player.component.scss']
})
export class SunbirdVideoPlayerComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() playerConfig: PlayerConfig;
  @Input() action?: IAction;
  @Output() playerEvent: EventEmitter<object>;
  @Output() telemetryEvent: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('videoPlayer', { static: true }) videoPlayerRef: ElementRef;
  viewState = 'player';
  public traceId: string;
  public nextContent: any;
  showContentError: boolean;
  showControls = true;
  sideMenuConfig = {
    showShare: true,
    showDownload: true,
    showReplay: true,
    showExit: true
  };
  private unlistenTouchStart: () => void;
  private unlistenMouseMove: () => void;
  isPaused = false;
  showQumlPlayer = false;
  QumlPlayerConfig: any = {};
  videoInstance: any;
  currentInterceptionTime;
  currentInterceptionUIId;
  isFullScreen = false;
  playerAction: IAction;
  public isInitialized = false;
  // Raw transcripts payload from the last playerConfig applied, kept
  // separate from viewerService.transcripts (which handlePlayerConfigUpdate
  // compares against) - viewerService.transcripts gets mutated in place
  // (offline basePath prefixing, default-language flagging), so comparing
  // a fresh incoming payload against it would spuriously look "changed" on
  // every update, even when the host pushed the exact same transcripts.
  private lastRawTranscripts: any;

  constructor(
    public videoPlayerService: SunbirdVideoPlayerService,
    public viewerService: ViewerService,
    public cdr: ChangeDetectorRef,
    private renderer2: Renderer2,
    public errorService: ErrorService
  ) {
    this.playerEvent = this.viewerService.playerEvent;
    this.viewerService.playerEvent.subscribe(event => {
      if (event.type === 'pause') {
        this.isPaused = true;
        this.showControls = true;
      }
      if (event.type === 'play') {
        this.isPaused = false;
      }
      if (event.type === 'loadstart') {
        this.viewerService.raiseStartEvent(event);
      }
      if (event.type === 'ended') {
        this.viewerService.endPageSeen = true;
        this.viewerService.raiseEndEvent();
        this.viewState = 'end';
        this.cdr.detectChanges();
      }
      if (event.type === 'error') {
        // eslint-disable-next-line one-var
        let code = errorCode.contentLoadFails,
          message = errorMessage.contentLoadFails;
        if (this.viewerService.isAvailableLocally) {
          code = errorCode.contentLoadFails;
          message = errorMessage.contentLoadFails;
        }
        if (code === errorCode.contentLoadFails) {
          this.showContentError = true;
        }
        this.viewerService.raiseExceptionLog(code, message, event, this.traceId);

      }
      // eslint-disable-next-line max-len
      const events = [{ type: 'volumechange', telemetryEvent: 'VOLUME_CHANGE' }, { type: 'seeking', telemetryEvent: 'DRAG' }, { type: 'fullscreen', telemetryEvent: 'FULLSCREEN' },
      { type: 'ratechange', telemetryEvent: 'RATE_CHANGE' }];
      events.forEach(data => {
        if (event.type === data.type) {
          this.viewerService.raiseHeartBeatEvent(data.telemetryEvent);
        }
      });
    });
  }

  @HostListener('document:TelemetryEvent', ['$event'])
  onTelemetryEvent(event) {
    this.telemetryEvent.emit(event.detail);
  }

  ngOnInit() {
    this.isInitialized = true;
    if (this.playerConfig) {
      if (typeof this.playerConfig === 'string') {
        try {
          this.playerConfig = JSON.parse(this.playerConfig);
        } catch (error) {
          console.error('Invalid playerConfig: ', error);
        }
      }
    }
    setInterval(() => {
      if (!this.isPaused) {
        this.showControls = false;
      }
    }, 5000);

    /* eslint-disable @typescript-eslint/dot-notation */
    this.nextContent = this.playerConfig?.config?.nextContent;
    this.lastRawTranscripts = this.playerConfig?.metadata?.transcripts;
    this.traceId = this.playerConfig.config['traceId'];
    this.sideMenuConfig = { ...this.sideMenuConfig, ...this.playerConfig.config.sideMenu };
    this.videoPlayerService.initialize(this.playerConfig);
    this.viewerService.initialize(this.playerConfig);
    window.addEventListener('offline', this.raiseInternetDisconnectionError, true);
    this.QumlPlayerConfig.config = this.playerConfig.config;
    this.QumlPlayerConfig.config.sideMenu.enable = false;
    this.QumlPlayerConfig.context = this.playerConfig.context;
    this.setTelemetryObjectRollup(this.playerConfig.metadata.identifier);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.action) {
      if (!this.showQumlPlayer) {
        this.playerAction = this.action;
      }
    }
    if (changes?.playerConfig?.firstChange && this.isInitialized) {
      // Calling for web component explicitly and life cycle works in different order
      this.ngOnInit();
    } else if (changes?.playerConfig && !changes.playerConfig.firstChange && this.isInitialized) {
      // A genuine subsequent playerConfig update (e.g. host pushes newly-generated
      // transcripts while the player is already mounted) - deliberately does NOT
      // re-run ngOnInit(), which would tear down/recreate state and interrupt
      // playback. Only transcripts are hot-swappable today; other playerConfig
      // fields are still effectively fixed after first load.
      this.handlePlayerConfigUpdate(changes.playerConfig.currentValue);
    }
  }

  private handlePlayerConfigUpdate(rawConfig: PlayerConfig | string) {
    let parsedConfig: PlayerConfig;
    if (typeof rawConfig === 'string') {
      try {
        parsedConfig = JSON.parse(rawConfig);
      } catch (error) {
        console.error('Invalid playerConfig update: ', error);
        return;
      }
    } else {
      parsedConfig = rawConfig;
    }
    const newTranscripts = parsedConfig?.metadata?.transcripts;
    if (newTranscripts && JSON.stringify(newTranscripts) !== JSON.stringify(this.lastRawTranscripts)) {
      this.lastRawTranscripts = newTranscripts;
      this.viewerService.updateTranscripts(newTranscripts);
    }
  }

  raiseInternetDisconnectionError = () => {
    const code = errorCode.internetConnectivity;
    const message = errorMessage.internetConnectivity;
    const stacktrace = `${code}: ${message}`;
    this.viewerService.raiseExceptionLog(code, message, stacktrace, this.traceId);
  }

  ngAfterViewInit() {
    const videoPlayerElement = this.videoPlayerRef.nativeElement;
    this.unlistenMouseMove = this.renderer2.listen(videoPlayerElement, 'mousemove', () => {
      this.showControls = true;
    });

    this.unlistenTouchStart = this.renderer2.listen(videoPlayerElement, 'touchstart', () => {
      this.showControls = true;
    });

    const contentCompabilityLevel = this.playerConfig.metadata['compatibilityLevel'];
    if (contentCompabilityLevel) {
      const checkContentCompatible = this.errorService.checkContentCompatibility(contentCompabilityLevel);
      if (!checkContentCompatible['isCompitable']) {
        // eslint-disable-next-line max-len
        this.viewerService.raiseExceptionLog(errorCode.contentCompatibility, errorMessage.contentCompatibility, checkContentCompatible['error']['message'], this.traceId);
      }
    }
  }

  sideBarEvents(event: ISideBarEvent) {
    this.playerEvent.emit(event);
    if (event.type === 'DOWNLOAD') {
      this.downloadVideo();
    }
    const events = ['SHARE', 'DOWNLOAD_MENU', 'EXIT', 'CLOSE_MENU', 'OPEN_MENU', 'DOWNLOAD_POPUP_CANCEL', 'DOWNLOAD_POPUP_CLOSE'];
    events.forEach(data => {
      if (event.type === data) {
        this.viewerService.raiseHeartBeatEvent(data);
      }
      if (event.type === 'EXIT') {
        this.viewerService.sidebarMenuEvent.emit('CLOSE_MENU');
      }
    });
  }

  setTelemetryObjectRollup(id) {
    if (this.QumlPlayerConfig.context) {
      const hasObjectRollup = this.QumlPlayerConfig && this.QumlPlayerConfig.context && this.QumlPlayerConfig.context.objectRollup;
      if (!hasObjectRollup) {
        this.QumlPlayerConfig.context.objectRollup = {};
      }
      const levels = Object.keys(this.QumlPlayerConfig.context.objectRollup);
      this.QumlPlayerConfig.context.objectRollup[`l${levels.length + 1}`] = id;
    }
  }

  playContent(event) {
    this.viewerService.raiseHeartBeatEvent(event.type);
  }

  replayContent(event) {
    this.playerEvent.emit(event);
    this.viewState = 'player';
    this.viewerService.isEndEventRaised = false;
    this.viewerService.raiseHeartBeatEvent('REPLAY');
    this.cdr.detectChanges();
  }

  exitContent(event) {
    try {
      this.viewerService.raiseEndEvent(true);
    } catch (error) {
      console.error('Error while raising end event: ', error);
    }
    this.playerEvent.emit(event);
    this.viewerService.raiseHeartBeatEvent('EXIT');
  }

  downloadVideo() {
    const a = document.createElement('a');
    a.href = this.viewerService.artifactUrl;
    a.download = this.viewerService.contentName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
    this.viewerService.raiseHeartBeatEvent('DOWNLOAD');
  }

  qumlPlayerEvents(event) {
    if (event.eid === 'QUML_SUMMARY') {
      this.showQumlPlayer = false;
      const score = parseInt(event.edata.extra.find(p => p.id === 'score')['value'], 10);
      this.viewerService.interceptionResponses[this.currentInterceptionTime] = {
        score,
        isSkipped: false
      };
      const interceptPointElement = document.querySelector(`[data-marker-time="${this.currentInterceptionTime}"]`);
      if (interceptPointElement) {
        interceptPointElement['style'].background = 'green';
      }
      this.videoInstance.play();
      this.videoInstance.controls(true);
      this.viewerService.raiseImpressionEvent('video');
      // if currently video is not in full screen and was previously full screen then set it back to full screen again
      if (!document.fullscreenElement && this.isFullScreen) {
        if (document.getElementsByClassName('video-js')[0]) {
          document.getElementsByClassName('video-js')[0].requestFullscreen()
            .catch((err) => console.error(err));
        }
      }
    }
  }

  questionSetData({ response, time, identifier }) {
    this.QumlPlayerConfig.metadata = response;
    this.QumlPlayerConfig.metadata['showStartPage'] = 'No';
    this.QumlPlayerConfig.metadata['showEndPage'] = 'No';
    this.currentInterceptionTime = time;
    this.currentInterceptionUIId = identifier;
    if (document.fullscreenElement) {
      this.isFullScreen = true;
      document.exitFullscreen()
        .catch((err) => console.error(err));
    } else {
      this.isFullScreen = false;
    }
    this.showQumlPlayer = true;
    this.viewerService.raiseImpressionEvent('interactive-question-set', { id: identifier, type: 'QuestionSet' });
    this.viewerService.raiseHeartBeatEvent('VIDEO_MARKER_SELECTED', {
      identifier, // Question set id,
      type: 'QuestionSet', // Type of interaction
      interceptedAt: time // Time when the interception happened
    });
  }

  playerInstance(event) {
    this.videoInstance = event;
  }

  @HostListener('window:beforeunload')
  ngOnDestroy() {
    this.viewerService.raiseEndEvent(true);
    this.unlistenTouchStart();
    this.unlistenMouseMove();
    this.viewerService.isEndEventRaised = false;
    window.removeEventListener('offline', this.raiseInternetDisconnectionError, true);
  }
}

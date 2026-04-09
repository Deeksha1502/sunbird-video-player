import { waitForAsync, ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { SunbirdVideoPlayerComponent } from './sunbird-video-player.component';
import { SunbirdVideoPlayerService } from './sunbird-video-player.service';
import { NO_ERRORS_SCHEMA, SimpleChange, SimpleChanges } from '@angular/core';
import { ViewerService } from './services/viewer.service';
import { HttpClientModule } from '@angular/common/http';
import { mockData } from './sunbird-video-player.component.spec.data';
import { ErrorService } from '@project-sunbird/sunbird-player-sdk-v9';
import { QuestionCursor } from '@project-sunbird/sunbird-quml-player-v9';
import { QuestionCursorImplementationService } from 'src/app/question-cursor-implementation.service';

describe('SunbirdVideoPlayerComponent', () => {
  let component: SunbirdVideoPlayerComponent;
  let fixture: ComponentFixture<SunbirdVideoPlayerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      declarations: [SunbirdVideoPlayerComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [ViewerService, SunbirdVideoPlayerService, ErrorService,
        { provide: QuestionCursor, useClass: QuestionCursorImplementationService }]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SunbirdVideoPlayerComponent);
    component = fixture.componentInstance;
    component.playerConfig = mockData.playerConfig;
    jasmine.clock().uninstall();
    jasmine.clock().install();
  });

  afterEach(function () {
    jasmine.clock().uninstall();
  });
  it('should create SunbirdVideoPlayerComponent', () => {
    expect(component).toBeTruthy();
  });
  it('show controls sould be false after mentioned time', () => {
    component.isPaused = false;
    setInterval(() => {
      if (!component.isPaused) {
        component.showControls = false;
      }
    }, 100);
    expect(component.showControls).toBeTruthy();
    jasmine.clock().tick(101);
    expect(component.showControls).toBeFalsy();
  });
  it('should call the playerInstance and define the videoInstance', () => {
    component.playerInstance({});
    expect(component.videoInstance).toEqual({});
  });
  it('should call exitContent and emit player event', () => {
    const event = {};
    spyOn(component.playerEvent, 'emit').and.callThrough();
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    spyOn(component.viewerService, 'raiseEndEvent');
    component.exitContent(event);
    expect(component.viewerService.raiseEndEvent).toHaveBeenCalled();
    expect(component.playerEvent.emit).toHaveBeenCalledWith({});
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith('EXIT');
  });
  it('should call replayContent and emit player event for REPLAY raiseHeartBeatEvent', () => {
    const event = {};
    spyOn(component.playerEvent, 'emit').and.callThrough();
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    spyOn(component.cdr, 'detectChanges');
    component.replayContent(event);
    expect(component.playerEvent.emit).toHaveBeenCalledWith({});
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith('REPLAY');
    expect(component.viewState).toEqual('player');
    expect(component.cdr.detectChanges).toHaveBeenCalled();
    expect(component.viewerService.isEndEventRaised).toBeFalsy();
  });
  it('should call playContent and call raiseHeartBeatEvent ', () => {
    const event = { type: 'PLAY' };
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.playContent(event);
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith('PLAY');
  });
  it('should call sideBarEvents and call download video', () => {
    const event = { type: 'DOWNLOAD', event: new MouseEvent('') };
    spyOn(component, 'downloadVideo').and.callFake(() => 'true');
    spyOn(component.viewerService.sidebarMenuEvent, 'emit').and.callThrough();
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.sideBarEvents(event);
    expect(component.downloadVideo).toHaveBeenCalled();
    expect(component.viewerService.raiseHeartBeatEvent).not.toHaveBeenCalledWith('DOWNLOAD');
    expect(component.viewerService.sidebarMenuEvent.emit).not.toHaveBeenCalledWith('CLOSE_MENU');
  });
  it('should call sideBarEvents and call raiseHeartBeatEvent for event EXIT', () => {
    const event = { type: 'EXIT', event: new MouseEvent('') };
    spyOn(component, 'downloadVideo').and.callFake(() => 'true');
    spyOn(component.viewerService.sidebarMenuEvent, 'emit').and.callThrough();
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.sideBarEvents(event);
    expect(component.downloadVideo).not.toHaveBeenCalled();
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith('EXIT');
    expect(component.viewerService.sidebarMenuEvent.emit).toHaveBeenCalledWith('CLOSE_MENU');
  });
  it('should call sideBarEvents and call raiseHeartBeatEvent for events share and etc', () => {
    const event = { type: 'SHARE', event: new MouseEvent('') };
    spyOn(component, 'downloadVideo').and.callFake(() => 'true');
    spyOn(component.viewerService.sidebarMenuEvent, 'emit').and.callThrough();
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.sideBarEvents(event);
    expect(component.downloadVideo).not.toHaveBeenCalled();
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith('SHARE');
    expect(component.viewerService.sidebarMenuEvent.emit).not.toHaveBeenCalledWith('CLOSE_MENU');
  });
  it('should call downloadVideo ', () => {
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.downloadVideo();
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith('DOWNLOAD');
  });
  it('should call onTelemetryEvent', () => {
    spyOn(component.telemetryEvent, 'emit').and.callThrough();
    const event = { detail: 'asdf' };
    component.onTelemetryEvent(event);
    expect(component.telemetryEvent.emit).toHaveBeenCalledWith(event.detail);
  });
  it('should call setTelemetryObjectRollup', () => {
    component.QumlPlayerConfig = mockData.playerConfig;
    component.setTelemetryObjectRollup(1234);
    expect(component.QumlPlayerConfig.context).toBeDefined();
  });
  it('should call ngOnInit', () => {
    spyOn(component.videoPlayerService, 'initialize').and.callThrough();
    spyOn(component.viewerService, 'initialize').and.callThrough();
    spyOn(component, 'setTelemetryObjectRollup').and.callThrough();
    component.ngOnInit();
    expect(component.viewerService.initialize).toHaveBeenCalledWith(component.playerConfig);
    expect(component.videoPlayerService.initialize).toHaveBeenCalledWith(component.playerConfig);
    expect(component.setTelemetryObjectRollup).toHaveBeenCalledWith(component.playerConfig.metadata.identifier);
    expect(component.playerConfig).toBeDefined();
    expect(component.QumlPlayerConfig).toBeDefined();
    expect(component.QumlPlayerConfig.config).toBeDefined();
    expect(component.QumlPlayerConfig.context).toBeDefined();
    expect(component.traceId).toEqual(component.playerConfig.config.traceId);
  });
  it('should call raiseInternetDisconnectionError', () => {
    // eslint-disable-next-line @typescript-eslint/dot-notation
    component.videoPlayerService['context'] = {
      channel: '12345'
    };
    component.traceId = '123';
    spyOn(component.viewerService, 'raiseExceptionLog').and.callFake(() => 'true');
    component.raiseInternetDisconnectionError();
    expect(component.viewerService.raiseExceptionLog).toHaveBeenCalledWith('CPV2_INT_CONNECT_01',
      'content failed to load , No Internet Available',
      'CPV2_INT_CONNECT_01: content failed to load , No Internet Available', component.traceId);
  });

  it('should show the quml player and send required telemetry', () => {
    const options = {
      response: mockData.questionSet, time: 80, identifier: mockData.questionSet.identifier
    };
    component.QumlPlayerConfig = mockData.playerConfig;
    const viewerService = TestBed.inject(ViewerService);
    const spy = spyOn(viewerService, 'raiseImpressionEvent').and.callFake(() => 'true');
    const spy1 = spyOn(viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.questionSetData(options);
    expect(spy).toHaveBeenCalledWith('interactive-question-set', { id: 'do_123456789', type: 'QuestionSet' });
    expect(spy1).toHaveBeenCalled();
  });

  it('should raise Impression when question set ends', () => {
    const viewerService = TestBed.inject(ViewerService);
    const spy = spyOn(viewerService, 'raiseImpressionEvent').and.callFake(() => 'true');
    component.videoInstance = jasmine.createSpyObj('videoInstance', ['controls', 'play']);
    component.qumlPlayerEvents({ eid: 'QUML_SUMMARY', edata: { extra: [{ id: 'score', value: '100' }] } });
    expect(spy).toHaveBeenCalledWith('video');
  });

  it('should keep the video paused on QumlPlayer load till it is shown', () => {
    component.action = {
      name: 'pause'
    };
    component.playerAction = {
      name: 'play'
    };
    component.showQumlPlayer = true;
    spyOn(component, 'ngOnChanges').and.callThrough();
    component.ngOnChanges(mockData.mockChangesForPlay);
    expect(component.ngOnChanges).toHaveBeenCalled();
    expect(component.showQumlPlayer).toBeTruthy();
    expect(component.playerAction.name).toEqual('play');
  });

  it('#ngOnChange() should update play/pause when QumlPlayer is off', () => {
    component.action = {
      name: 'pause'
    };
    component.playerAction = {
      name: 'play'
    };
    component.showQumlPlayer = false;
    spyOn(component, 'ngOnChanges').and.callThrough();
    component.ngOnChanges(mockData.mockChangesForPause);
    expect(component.ngOnChanges).toHaveBeenCalled();
    expect(component.showQumlPlayer).toBeFalsy();
    expect(component.playerAction.name).toEqual('pause');
  });

  it('#ngOnChange() should not set action.name value', () => {
    component.action = {
      name: ''
    };
    component.showQumlPlayer = true;
    spyOn(component, 'ngOnChanges').and.callThrough();
    component.ngOnChanges(mockData.mockChangesForDefault);
    expect(component.ngOnChanges).toHaveBeenCalled();
    expect(component.showQumlPlayer).toBeTruthy();
    expect(component.action.name).toEqual('');
  });

  it('#qumlPlayerEvents() should not call videoInstance.play and videoInstance.controls', () => {
    component.videoInstance = {
      play() { return; },
      controls(event) { return; }
    };
    spyOn(component.videoInstance, 'play').and.callFake(() => { });
    spyOn(component.videoInstance, 'controls').and.callFake(() => { });
    spyOn(component, 'qumlPlayerEvents').and.callThrough();
    component.qumlPlayerEvents({ eid: 'Start' });
    expect(component.qumlPlayerEvents).toHaveBeenCalled();
    expect(component.videoInstance.play).not.toHaveBeenCalled();
    expect(component.videoInstance.controls).not.toHaveBeenCalled();
  });

  it('#qumlPlayerEvents() should call videoInstance.play and videoInstance.controls', () => {
    const qumlEventSummary = {
      eid: 'QUML_SUMMARY',
      ver: '1.0',
      edata: {
        type: 'QUML_SUMMARY',
        currentIndex: 0,
        duration: 16,
        extra: [{ id: 'score', value: 1 }]
      }
    };
    component.videoInstance = {
      play() { },
      controls(event) { }
    };
    component.isFullScreen = false;
    component.currentInterceptionTime = '5e242d8c-b6dd-4b6b-b147-ca63d449c975';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="vjs-marker" data-marker-key="5e242d8c-b6dd-4b6b-b147-ca63d449c975"
     data-marker-time="50" style="width: 7px; border-radius: 30%; background-color: orange; height: 7px;
     bottom: 39%; margin-left: -3.5px; left: 36.3478%;"></div>`;
    spyOn(document, 'querySelector').and.returnValue(wrapper);
    spyOn(component.videoInstance, 'play');
    spyOn(component.videoInstance, 'controls');
    const viewerService = TestBed.inject(ViewerService);
    spyOn(viewerService, 'raiseImpressionEvent').and.callFake(() => 'true');
    component.qumlPlayerEvents(qumlEventSummary);
    expect(component.videoInstance.play).toHaveBeenCalled();
    expect(component.videoInstance.controls).toHaveBeenCalled();
    expect(viewerService.raiseImpressionEvent).toHaveBeenCalled();
  });

  it('#qumlPlayerEvents() should set player to full screen', () => {
    const qumlEventSummary = {
      eid: 'QUML_SUMMARY',
      ver: '1.0',
      edata: {
        type: 'QUML_SUMMARY',
        currentIndex: 0,
        duration: 16,
        extra: [{ id: 'score', value: 1 }]
      }
    };
    component.videoInstance = {
      play() { return; },
      controls(event) { return; }
    };
    component.isFullScreen = false;
    component.currentInterceptionTime = '5e242d8c-b6dd-4b6b-b147-ca63d449c975';
    spyOn(console, 'error');
    spyOn(document, 'querySelector').and.returnValue(undefined);
    spyOn(document, 'getElementsByClassName').and.callThrough();
    spyOn(component.videoInstance, 'play');
    spyOn(component.videoInstance, 'controls');
    const viewerService = TestBed.inject(ViewerService);
    spyOn(viewerService, 'raiseImpressionEvent').and.callFake(() => 'true');
    component.qumlPlayerEvents(qumlEventSummary);
    expect(component.videoInstance.play).toHaveBeenCalled();
    expect(component.videoInstance.controls).toHaveBeenCalled();
    expect(document.getElementsByClassName('video-js')[0]).not.toBeDefined();
    expect(console.error).not.toHaveBeenCalled();
    expect(viewerService.raiseImpressionEvent).toHaveBeenCalled();
  });

  it('#questionSetData() should not call document.exitFullscreen()', () => {
    component.isFullScreen = false;
    component.currentInterceptionTime = undefined;
    component.currentInterceptionUIId = undefined;
    component.QumlPlayerConfig = { metadata: { showStartPage: '', showEndPage: '' } };
    spyOn(document, 'exitFullscreen');
    const parameter = {
      response: { name: 'Video' },
      time: 100,
      identifier: 'do_123'
    };
    const viewerService = TestBed.inject(ViewerService);
    spyOn(viewerService, 'raiseImpressionEvent').and.callFake(() => 'true');
    spyOn(viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.questionSetData(parameter);
    expect(component.QumlPlayerConfig.metadata).toBeDefined();
    expect(component.QumlPlayerConfig.metadata.showStartPage).toEqual('No');
    expect(component.QumlPlayerConfig.metadata.showEndPage).toEqual('No');
    expect(component.currentInterceptionTime).toEqual(100);
    expect(component.currentInterceptionUIId).toEqual('do_123');
    expect(component.isFullScreen).toBeFalsy();
    expect(document.exitFullscreen).not.toHaveBeenCalled();
    expect(viewerService.raiseHeartBeatEvent).toHaveBeenCalled();
    expect(viewerService.raiseImpressionEvent).toHaveBeenCalled();
  });
  it('should call ngOnChanges and call ngOnInit when isInitialized is true', () => {
    spyOn(component.videoPlayerService, 'initialize').and.callThrough();
    component.isInitialized = true;
    const changes: SimpleChanges = {
      action: new SimpleChange('play', 'view', true),
      playerConfig: new SimpleChange('play', 'view', true)
    };
    spyOn(component, 'ngOnInit');
    component.ngOnChanges(changes);
    expect(component.ngOnInit).toHaveBeenCalled();
  });
  it('should call ngOnChanges and should not call ngOnInit when isInitialized is false', () => {
    spyOn(component.videoPlayerService, 'initialize').and.callThrough();
    component.isInitialized = false;
    const changes: SimpleChanges = {
      action: new SimpleChange('play', 'view', true),
      playerConfig: new SimpleChange('play', 'view', true)
    };
    spyOn(component, 'ngOnInit');
    component.ngOnChanges(changes);
    expect(component.ngOnInit).not.toHaveBeenCalled();
  });
});

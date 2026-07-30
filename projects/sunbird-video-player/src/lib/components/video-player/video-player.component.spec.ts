import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { VideoPlayerComponent } from './video-player.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ViewerService } from '../../services/viewer.service';
import { SunbirdVideoPlayerService } from '../../sunbird-video-player.service';
import { QuestionCursor } from '@project-sunbird/sunbird-quml-player-v9';
import { QuestionCursorImplementationService } from 'src/app/question-cursor-implementation.service';
import {mockData} from './video-player.component.data';
describe('VideoPlayerComponent', () => {
  let component: VideoPlayerComponent;
  let fixture: ComponentFixture<VideoPlayerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      declarations: [VideoPlayerComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [ViewerService, SunbirdVideoPlayerService,
        { provide: QuestionCursor, useClass: QuestionCursorImplementationService }]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VideoPlayerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('should call pause()', () => {
    spyOn(component, 'toggleForwardRewindButton').and.callFake(() => 'true');
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.player = {
      pause: jasmine.createSpy('pause')
    };
    component.pause();
    expect(component.showPauseButton).toBeFalsy();
    expect(component.showPlayButton).toBeTruthy();
    expect(component.currentPlayerState).toEqual('pause');
    expect(component.toggleForwardRewindButton).toHaveBeenCalled();
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith('PAUSE');
    expect(component.player.pause).toHaveBeenCalled();
  });
  it('should call play()', () => {
    spyOn(component, 'toggleForwardRewindButton').and.callFake(() => 'true');
    component.player = {
      play: jasmine.createSpy('play')
    };
    component.play();
    expect(component.showPauseButton).toBeTruthy();
    expect(component.showPlayButton).toBeFalsy();
    expect(component.currentPlayerState).toEqual('play');
    expect(component.toggleForwardRewindButton).toHaveBeenCalled();
    expect(component.player.play).toHaveBeenCalled();
  });
  it('should call backward()', () => {
    spyOn(component, 'toggleForwardRewindButton').and.callFake(() => 'true');
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.backward();
    expect(component.toggleForwardRewindButton).toHaveBeenCalled();
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith('BACKWARD');
  });
  it('should call backward()', () => {
    spyOn(component, 'toggleForwardRewindButton').and.callFake(() => 'true');
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.forward();
    expect(component.toggleForwardRewindButton).toHaveBeenCalled();
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith('FORWARD');
  });
  it('should call handleVideoControls', () => {
    component.player = {
      currentTime: jasmine.createSpy('currentTime')
    };
    spyOn(component, 'updatePlayerEventsMetadata').and.callFake(() => 'true');
    component.totalSpentTime = 0;
    component.startTime = 0;
    component.handleVideoControls({ type: 'ended' });
    expect(component.totalSpentTime).toString();
    expect(component.viewerService.visitedLength).toEqual(component.viewerService.getVisitedLength());
  });
  it('should call handleVideoControls for playing and setPreMetaDataConfig', () => {
    component.setMetaDataConfig = true;
    spyOn(component, 'setPreMetaDataConfig').and.callThrough();
    component.handleVideoControls({ type: 'playing' });
    expect(component.showPlayButton).toBeFalsy();
    expect(component.showPauseButton).toBeTruthy();
    expect(component.setMetaDataConfig).toBeFalsy();
    expect(component.setPreMetaDataConfig).toHaveBeenCalled();
  });
  it('should call handleVideoControls for playing and setPreMetaDataConfig is false', () => {
    component.setMetaDataConfig = false;
    spyOn(component, 'setPreMetaDataConfig').and.callThrough();
    component.handleVideoControls({ type: 'playing' });
    expect(component.showPlayButton).toBeFalsy();
    expect(component.showPauseButton).toBeTruthy();
    expect(component.setMetaDataConfig).not.toBeTruthy();
    expect(component.setPreMetaDataConfig).not.toHaveBeenCalled();
  });
  it('should call handleVideoControls for play ', () => {
    spyOn(component, 'updatePlayerEventsMetadata').and.callFake(() => 'true');
    component.handleVideoControls({ type: 'play' });
    expect(component.startTime).toBeDefined();
    expect(component.updatePlayerEventsMetadata).toHaveBeenCalledWith({ type: 'play' });
  });
  it('should call handleVideoControls for play ', () => {
    component.handleVideoControls({ type: 'loadstart' });
    expect(component.startTime).toBeDefined();
    expect(component.setMetaDataConfig).toBeTruthy();
  });
  it('should call handleVideoControls for timeupdate', () => {
    component.currentTime = 16990999900;
    component.player = {
      currentTime: jasmine.createSpy('currentTime')
    };
    spyOn(component, 'toggleForwardRewindButton').and.callThrough();
    component.handleVideoControls({ type: 'timeupdate' });
    expect(component.previousTime).toEqual(16990999900);
    expect(component.toggleForwardRewindButton).toHaveBeenCalled();
    expect(component.player.currentTime).toHaveBeenCalled();
  });
  it('should call handleVideoControls for seeking ', () => {
    component.previousTime = 16990999900;
    component.seekStart = null;
    component.handleVideoControls({ type: 'seeking' });
    expect(component.seekStart).toEqual(component.previousTime);
  });
  it('should call handleVideoControls for seeked for currentTime > seekStart', () => {
    component.player = {
      markers: jasmine.createSpy('markers')
    };
    component.currentTime = 1000;
    component.seekStart = 900;
    spyOn(component, 'updatePlayerEventsMetadata').and.callFake(() => 'true');
    component.handleVideoControls({ type: 'seeked' });
    expect(component.updatePlayerEventsMetadata).toHaveBeenCalledWith({ type: 'seeked' });
    expect(component.totalSeekedLength).toBeDefined();
    expect(component.viewerService.totalSeekedLength).toEqual(component.totalSeekedLength);
  });
  it('should call handleVideoControls for seeked  for currentTime < seekStart', () => {
    component.player = {
      markers: jasmine.createSpy('markers')
    };
    component.currentTime = 100;
    component.seekStart = 900;
    spyOn(component, 'updatePlayerEventsMetadata').and.callFake(() => 'true');
    component.handleVideoControls({ type: 'seeked' });
    expect(component.updatePlayerEventsMetadata).toHaveBeenCalledWith({ type: 'seeked' });
    expect(component.totalSeekedLength).toBeDefined();
    expect(component.viewerService.totalSeekedLength).toEqual(component.totalSeekedLength);
  });
  it('should call handleVideoControls for seeking ', () => {
    component.viewerService.metaData = { actions: [] };
    component.player = {
      currentTime: jasmine.createSpy('currentTime')
    };
    component.updatePlayerEventsMetadata({ type: 'seeking' });
    expect(component.viewerService.metaData.actions).toBeDefined();
  });
  it('should call setPreMetaDataConfig for player.volume', () => {
    component.config = { volume: { name: 'qwe' } };
    component.player = {
      volume: jasmine.createSpy('volume')
    };
    component.setPreMetaDataConfig();
    expect(component.player.volume).toHaveBeenCalled();
  });
  it('should call setPreMetaDataConfig for player.currentTime', () => {
    component.config = { currentDuration: 600000 };
    component.player = {
      currentTime: jasmine.createSpy('currentTime')
    };
    component.setPreMetaDataConfig();
    expect(component.player.currentTime).toHaveBeenCalled();
  });
  it('should call onLoadMetadata ', () => {
    component.viewerService.metaData = { totalDuration: 10000 };
    component.player = {
      duration: jasmine.createSpy('duration').and.returnValue(1000)
    };
    component.onLoadMetadata('e');
    expect(component.totalDuration).toBeDefined();
    expect(component.viewerService.metaData.totalDuration).toBeDefined();
  });
  it('should call registerEvents ', () => {
    component.player = {
      play: jasmine.createSpy('play'),
      on: jasmine.createSpy('on')
    };
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    spyOn(component, 'trackTranscriptEvent').and.callFake(() => 'true');
    component.registerEvents();
    expect(component.isAutoplayPrevented).toBeFalsy();
    expect(component.player.play).toHaveBeenCalled();
  });
  it('should call duration change event ', () => {
    const viewerService = TestBed.inject(ViewerService);
    viewerService.metaData = {
      actions: [],
      volume: [],
      playBackSpeeds: [],
      totalDuration: 0,
      muted: undefined,
      currentDuration: undefined,
      transcripts: []
    };
    component.player = {
      play: jasmine.createSpy('play'),
      playbackRate: jasmine.createSpy('playbackRate'),
      volume: jasmine.createSpy('volume'),
      muted: jasmine.createSpy('muted'),
      currentTime: jasmine.createSpy('currentTime'),
      isFullscreen: jasmine.createSpy('isFullscreen'),
      duration: jasmine.createSpy('duration').and.returnValue(1290),
      textTracks: jasmine.createSpy('textTracks').and.returnValue([]),
      addClass: jasmine.createSpy('addClass'),
      removeClass: jasmine.createSpy('removeClass'),
      on: jasmine.createSpy('on').and.callFake((event, callback) => {
        expect(typeof callback).toBe('function');
        callback('pause', 'successResponse');
      })
    };
    spyOn(component, 'trackTranscriptEvent');
    spyOn(component, 'pause');
    spyOn(viewerService, 'raiseHeartBeatEvent');
    spyOn(viewerService.playerEvent, 'emit');
    component.registerEvents();
    expect(component.trackTranscriptEvent).toHaveBeenCalled();
    expect(component.player.on).toHaveBeenCalled();
    expect(component.pause).toHaveBeenCalled();
    expect(viewerService.raiseHeartBeatEvent).toHaveBeenCalled();
    expect(component.totalDuration).toBe(1290);
    expect(viewerService.metaData.totalDuration).toBe(1290);
    expect(viewerService.playerEvent.emit).toHaveBeenCalled();
  });
  it('should call toggleForwardRewindButton and totalDuration > currentTime', () => {
    component.time = 0;
    component.totalDuration = 600000;
    spyOn(component.cdr, 'detectChanges');
    component.player = {
      currentTime: jasmine.createSpy('currentTime').and.returnValue(60000),
    };
    component.toggleForwardRewindButton();
    expect(component.showForwardButton).toBeTruthy();
    expect(component.cdr.detectChanges).toHaveBeenCalled();
    expect(component.showBackwardButton).toBeTruthy();
  });
  it('should call toggleForwardRewindButton and totalDuration < currentTime', () => {
    component.time = 0;
    component.totalDuration = 10000;
    spyOn(component.cdr, 'detectChanges');
    component.player = {
      currentTime: jasmine.createSpy('currentTime').and.returnValue(60000),
    };
    component.toggleForwardRewindButton();
    expect(component.showForwardButton).toBeFalsy();
    expect(component.cdr.detectChanges).toHaveBeenCalled();
    expect(component.showBackwardButton).toBeTruthy();
  });
  it('should call toggleForwardRewindButton and totalDuration < currentTime for showBackwardButton', () => {
    component.time = 20000;
    component.totalDuration = 30000;
    spyOn(component.cdr, 'detectChanges');
    component.player = {
      currentTime: jasmine.createSpy('currentTime').and.returnValue(10000),
    };
    component.toggleForwardRewindButton();
    expect(component.showForwardButton).toBeTruthy();
    expect(component.cdr.detectChanges).toHaveBeenCalled();
    expect(component.showBackwardButton).toBeFalsy();
  });
  it('should call handleEventsForTranscripts for transcript language off', () => {
   const telemetryObject = {
      type: 'TRANSCRIPT_LANGUAGE_OFF',
      extra: {
        videoTimeStamp: 1.20
      }
    };
   component.viewerService.metaData = { transcripts: ['en'] };
   component.player = {
      currentTime: jasmine.createSpy('currentTime').and.returnValue(1.20),
    };
   spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
   component.handleEventsForTranscripts({});
   expect(component.player.currentTime).toHaveBeenCalled();
   expect(component.viewerService.metaData.transcripts).toEqual(['en', 'off']);
   expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith(telemetryObject.type, telemetryObject.extra);
  });
  it('should call handleEventsForTranscripts for transcript language selected', () => {
    component.transcripts = mockData.transcripts;
    const telemetryObject = {
       type: 'TRANSCRIPT_LANGUAGE_SELECTED',
       extra: {
         videoTimeStamp: 2.230,
         transcript: {
          language: 'Bengali'
        },
       }
     };
    component.viewerService.metaData = { transcripts: ['en'] };
    component.player = {
       currentTime: jasmine.createSpy('currentTime').and.returnValue(2.230),
       textTracks: jasmine.createSpy('textTracks').and.returnValue([]),
       addClass: jasmine.createSpy('addClass'),
       removeClass: jasmine.createSpy('removeClass'),
     };
    const track =  { artifactUrl: 'https://cdn.jsdelivr.net/gh/tombyrer/videojs-transcript-click@1.0/demo/captions.sv.vtt',
      languageCode: 'bn' };
    spyOn(component.viewerService, 'raiseHeartBeatEvent').and.callFake(() => 'true');
    component.handleEventsForTranscripts(track);
    expect(component.player.currentTime).toHaveBeenCalled();
    expect(component.viewerService.metaData.transcripts).toEqual(['en', 'bn']);
    expect(component.viewerService.raiseHeartBeatEvent).toHaveBeenCalledWith(telemetryObject.type, telemetryObject.extra);
   });
  it('should play the video from point it was paused while adding question set on cancel click', () => {
      component.player = {
        play: jasmine.createSpy('play')
      };
      spyOn(component, 'play');
      component.ngOnChanges(mockData.changesForPlay);
      expect(component.play).toHaveBeenCalled();
  });
  it('should pause the video on question set addition on add question set click', () => {
    component.player = {
      pause: jasmine.createSpy('pause')
    };
    spyOn(component, 'pause');
    component.ngOnChanges(mockData.changesForPause);
    expect(component.pause).toHaveBeenCalled();
  });
  it('should not take any action on blank name property ', () => {
    component.player = {
      play: jasmine.createSpy('play'),
      pause: jasmine.createSpy('pause')
    };
    spyOn(component, 'pause');
    spyOn(component, 'play');
    component.ngOnChanges(mockData.changesForBlank);
    expect(component.pause).not.toHaveBeenCalled();
    expect(component.play).not.toHaveBeenCalled();
  });

  it('should attach captions and metadata tracks for transcripts with wordByWordUrl', () => {
    const captionsTrack = { track: { mode: 'disabled' } };
    const metadataTrack = { track: { mode: 'disabled' } };
    component.player = {
      addRemoteTextTrack: jasmine.createSpy('addRemoteTextTrack').and.callFake((opts) => {
        return opts.kind === 'captions' ? captionsTrack : metadataTrack;
      })
    };
    const transcripts = [{ language: 'English', languageCode: 'en', artifactUrl: 'en.vtt', wordByWordUrl: 'en-word.vtt' }];
    (component as any).attachTranscriptTracks(transcripts);
    expect(component.player.addRemoteTextTrack).toHaveBeenCalledTimes(2);
    expect((component as any).attachedTextTracks.get('captions|en')).toBe(captionsTrack.track);
    expect((component as any).attachedTextTracks.get('metadata|en')).toBe(metadataTrack.track);
  });

  it('should not attach a metadata track when wordByWordUrl is absent', () => {
    const captionsTrack = { track: { mode: 'disabled' } };
    component.player = {
      addRemoteTextTrack: jasmine.createSpy('addRemoteTextTrack').and.returnValue(captionsTrack)
    };
    (component as any).attachTranscriptTracks([{ language: 'English', languageCode: 'en', artifactUrl: 'en.vtt' }]);
    expect(component.player.addRemoteTextTrack).toHaveBeenCalledTimes(1);
    expect((component as any).attachedTextTracks.has('metadata|en')).toBeFalsy();
  });

  it('should mark the default transcript track as showing', () => {
    const captionsTrack = { track: { mode: 'disabled' } };
    component.player = {
      addRemoteTextTrack: jasmine.createSpy('addRemoteTextTrack').and.returnValue(captionsTrack)
    };
    (component as any).addTranscriptTrack('captions', { language: 'English', languageCode: 'en', artifactUrl: 'en.vtt', default: true });
    expect(captionsTrack.track.mode).toBe('showing');
  });

  it('should not throw when addRemoteTextTrack returns undefined because the tech is not ready yet', () => {
    component.player = {
      addRemoteTextTrack: jasmine.createSpy('addRemoteTextTrack').and.returnValue(undefined)
    };
    expect(() => (component as any).addTranscriptTrack('captions', { language: 'English', languageCode: 'en', artifactUrl: 'en.vtt' }))
      .not.toThrow();
    expect((component as any).attachedTextTracks.size).toBe(0);
  });

  it('should remove stale tracks and add new ones when transcripts are synced', () => {
    const oldTrack = { mode: 'showing' };
    const newCaptionsTrack = { track: { mode: 'disabled' } };
    (component as any).attachedTextTracks.set('captions|fr', oldTrack);
    component.config = { transcripts: [] };
    spyOn(component.viewerService, 'handleTranscriptsData').and.returnValue([
      { language: 'English', languageCode: 'en', artifactUrl: 'en.vtt', identifier: 'en-id' }
    ]);
    component.player = {
      removeRemoteTextTrack: jasmine.createSpy('removeRemoteTextTrack'),
      addRemoteTextTrack: jasmine.createSpy('addRemoteTextTrack').and.returnValue(newCaptionsTrack),
      textTracks: jasmine.createSpy('textTracks').and.returnValue([])
    };
    (component as any).syncTranscriptTracks([]);
    expect(component.player.removeRemoteTextTrack).toHaveBeenCalledWith(oldTrack);
    expect((component as any).attachedTextTracks.has('captions|fr')).toBeFalsy();
    expect((component as any).attachedTextTracks.get('captions|en')).toBe(newCaptionsTrack.track);
  });

  it('should activate the matching metadata track for word-highlight overlay', () => {
    const wordTrack: any = { kind: 'metadata', language: 'en', mode: 'disabled', cues: [] };
    component.player = {
      textTracks: jasmine.createSpy('textTracks').and.returnValue([wordTrack]),
      currentTime: jasmine.createSpy('currentTime').and.returnValue(0),
      addClass: jasmine.createSpy('addClass'),
      removeClass: jasmine.createSpy('removeClass')
    };
    (component as any).activateWordHighlightTrack('en');
    expect((component as any).activeWordTrack).toBe(wordTrack);
    expect(wordTrack.mode).toBe('hidden');
  });

  it('should deactivate the active word-highlight track', () => {
    const wordTrack: any = { mode: 'hidden' };
    (component as any).activeWordTrack = wordTrack;
    (component as any).showWordHighlightOverlay = true;
    component.player = {
      removeClass: jasmine.createSpy('removeClass'),
      addClass: jasmine.createSpy('addClass')
    };
    (component as any).deactivateWordHighlightTrack();
    expect(wordTrack.mode).toBe('disabled');
    expect((component as any).activeWordTrack).toBeNull();
    expect(component.player.removeClass).toHaveBeenCalledWith('word-highlight-active');
  });

  it('should accumulate consecutive word cues within the gap and character thresholds', () => {
    const cues = [
      { startTime: 0, endTime: 0.2, text: 'Hello' },
      { startTime: 0.25, endTime: 0.5, text: 'world' }
    ];
    (component as any).activeWordTrack = { cues };
    component.player = { addClass: jasmine.createSpy('addClass'), removeClass: jasmine.createSpy('removeClass') };
    (component as any).updateWordHighlightOverlay(0.5);
    expect((component as any).wordHighlightLineWords).toEqual(['Hello', 'world']);
  });

  it('should clear the accumulated line when the gap between cues exceeds the threshold', () => {
    const cues = [
      { startTime: 0, endTime: 0.2, text: 'Hello' },
      { startTime: 2, endTime: 2.3, text: 'world' }
    ];
    (component as any).activeWordTrack = { cues };
    component.player = { addClass: jasmine.createSpy('addClass'), removeClass: jasmine.createSpy('removeClass') };
    (component as any).updateWordHighlightOverlay(2.3);
    expect((component as any).wordHighlightLineWords).toEqual(['world']);
  });

  it('should clear the accumulated line when the character cap is exceeded', () => {
    (component as any).wordHighlightMaxLineCharacters = 10;
    const cues = [
      { startTime: 0, endTime: 0.1, text: 'Hello' },
      { startTime: 0.15, endTime: 0.3, text: 'World' },
      { startTime: 0.35, endTime: 0.5, text: 'Again' }
    ];
    (component as any).activeWordTrack = { cues };
    component.player = { addClass: jasmine.createSpy('addClass'), removeClass: jasmine.createSpy('removeClass') };
    (component as any).updateWordHighlightOverlay(0.5);
    expect((component as any).wordHighlightLineWords).toEqual(['Again']);
  });

  it('should reconstruct the current line backward from currentTime on seek', () => {
    const cues = [
      { startTime: 0, endTime: 0.2, text: 'Hello' },
      { startTime: 0.25, endTime: 0.5, text: 'world' },
      { startTime: 3, endTime: 3.2, text: 'later' }
    ];
    (component as any).activeWordTrack = { cues };
    component.player = { addClass: jasmine.createSpy('addClass'), removeClass: jasmine.createSpy('removeClass') };
    (component as any).rebuildWordHighlightAt(0.5);
    expect((component as any).wordHighlightLineWords).toEqual(['Hello', 'world']);
  });

  it('should show nothing after seeking past the last cue beyond the gap threshold', () => {
    const cues = [
      { startTime: 0, endTime: 0.2, text: 'Hello' }
    ];
    (component as any).activeWordTrack = { cues };
    component.player = { addClass: jasmine.createSpy('addClass'), removeClass: jasmine.createSpy('removeClass') };
    (component as any).rebuildWordHighlightAt(5);
    expect((component as any).wordHighlightLineWords).toEqual([]);
  });
});

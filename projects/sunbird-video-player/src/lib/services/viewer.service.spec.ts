import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { ViewerService } from './viewer.service';
import { SunbirdVideoPlayerService } from '../sunbird-video-player.service';
import { QuestionCursor } from '@project-sunbird/sunbird-quml-player-v9';
import { QuestionCursorImplementationService } from 'src/app/question-cursor-implementation.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { mockData } from './viewer.service.spec.data';
import { of } from 'rxjs';
describe('ViewerService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HttpClientModule],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [ViewerService, SunbirdVideoPlayerService,
      { provide: QuestionCursor, useClass: QuestionCursorImplementationService }]
  }));

  it('should be created ViewerService', () => {
    const service = TestBed.inject(ViewerService);
    expect(service).toBeTruthy();
  });
  it('should call raiseExceptionLog', () => {
    const service = TestBed.inject(ViewerService);
    spyOn(service.playerEvent, 'emit').and.callThrough();
    // eslint-disable-next-line @typescript-eslint/dot-notation
    spyOn(service['videoPlayerService'], 'error').and.callFake(() => 'true');
    const exceptionLogEvent = {
      eid: 'ERROR',
      edata: {
        err: 'errorCode',
        errtype: 'errorType',
        requestid: 'traceId',
        stacktrace:  'stacktrace'
      }
    };
    service.raiseExceptionLog(exceptionLogEvent.edata.err,
      exceptionLogEvent.edata.errtype, exceptionLogEvent.edata.stacktrace, exceptionLogEvent.edata.requestid);
    expect(service.playerEvent.emit).toHaveBeenCalledWith(exceptionLogEvent);
    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(service['videoPlayerService']['error']).toHaveBeenCalled();
  });
  it('should call raiseHeartBeatEvent for REPLAY', () => {
    const service = TestBed.inject(ViewerService);
    spyOn(service.playerEvent, 'emit').and.callThrough();
    // eslint-disable-next-line @typescript-eslint/dot-notation
    spyOn(service['videoPlayerService'], 'heartBeat').and.callFake(() => 'true');
    // eslint-disable-next-line @typescript-eslint/dot-notation
    spyOn(service['videoPlayerService'], 'interact').and.callFake(() => 'true');
    service.raiseHeartBeatEvent('REPLAY');
    expect(service.showScore).toBeFalsy();
    expect(service.scoreObtained).toEqual(0);
    expect(service.interceptionResponses).toEqual({});
  });
  it('should call calculateScore', () => {
    const service = TestBed.inject(ViewerService);
    service.interceptionResponses = {};
    service.calculateScore();
    expect(service.scoreObtained).toEqual(0);
  });
  it('should call raiseHeartBeatEvent for REPLAY', () => {
    const service = TestBed.inject(ViewerService);
    spyOn(service.playerEvent, 'emit').and.callThrough();
    // eslint-disable-next-line @typescript-eslint/dot-notation
    spyOn(service['videoPlayerService'], 'start').and.callFake(() => 'true');
    service.raiseStartEvent('');
    expect(service.PlayerLoadStartedAt).toBeDefined();
  });
  it('should call preFetchContent', () => {
    const service = TestBed.inject(ViewerService);
    spyOn(service, 'getNextMarker').and.returnValue({ identifier: '1234' });
    spyOn(service, 'getQuestionSet').and.callThrough();
    service.preFetchContent();
    expect(service.getQuestionSet).toHaveBeenCalledWith('1234');
  });
  it('should call raiseEndEvent for isEndEventRaised', () => {
    const service = TestBed.inject(ViewerService);
    service.isEndEventRaised = true;
    service.visitedLength = 60000;
    spyOn(service, 'calculateScore').and.callThrough();
    // eslint-disable-next-line @typescript-eslint/dot-notation
    spyOn(service['utilService'], 'getTimeSpentText').and.callFake(() => 'true');
    service.raiseEndEvent();
    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(service['utilService'].getTimeSpentText).not.toHaveBeenCalledWith(service.visitedLength);
    expect(service.calculateScore).not.toHaveBeenCalled();
  });
  it('should call getNextMarker for markerTime < currentTime', () => {
    const service = TestBed.inject(ViewerService);
    spyOn(service, 'getMarkers').and.returnValue([{ time: 100 }]);
    service.playerInstance = {
      currentTime: jasmine.createSpy('currentTime').and.returnValue(60000),
    };
    const returnValue = service.getNextMarker();
    expect(returnValue).toBeFalsy();
  });
  it('should call getNextMarker for markersList empty', () => {
    const service = TestBed.inject(ViewerService);
    spyOn(service, 'getMarkers').and.returnValue(null);
    service.playerInstance = {
      currentTime: jasmine.createSpy('currentTime').and.returnValue(60000),
    };
    const returnValue = service.getNextMarker();
    expect(returnValue).toBeNull();
  });
  it('should call initialize', () => {
    const service = TestBed.inject(ViewerService);
    service.initialize(mockData.playerConfig);
    expect(service.contentName).toString();
    expect(service.showDownloadPopup).toBeFalsy();
    expect(service.endPageSeen).toBeFalsy();
    expect(service.traceId).toString();
    expect(service.mimeType).toEqual(mockData.playerConfig.metadata.mimeType);
    expect(service.artifactMimeType).toEqual(mockData.playerConfig.metadata.mimeType);
  });
  it('should prefix relative transcript urls with basePath when isAvailableLocally', () => {
    const service = TestBed.inject(ViewerService);
    service.initialize({
      context: {},
      config: {},
      metadata: {
        name: 'Test', mimeType: 'video/mp4', identifier: 'do_1',
        isAvailableLocally: true, basePath: 'file:///content/do_1', artifactUrl: 'video.mp4',
        transcripts: [
          { language: 'English', identifier: 'en', languageCode: 'en', artifactUrl: 'captions/en.vtt', wordByWordUrl: 'captions/en.vtt' },
        ],
      },
    } as any);
    expect(service.transcripts[0].artifactUrl).toEqual('file:///content/do_1/captions/en.vtt');
    expect(service.transcripts[0].wordByWordUrl).toEqual('file:///content/do_1/captions/en.vtt');
  });

  it('should NOT prefix absolute (remote CDN) transcript urls when isAvailableLocally', () => {
    const service = TestBed.inject(ViewerService);
    service.initialize({
      context: {},
      config: {},
      metadata: {
        name: 'Test', mimeType: 'video/mp4', identifier: 'do_1',
        isAvailableLocally: true, basePath: 'file:///content/do_1', artifactUrl: 'video.mp4',
        transcripts: [
          { language: 'English', identifier: 'en', languageCode: 'en', artifactUrl: 'https://cdn.example.com/captions/en.vtt', wordByWordUrl: 'https://cdn.example.com/captions/en.vtt' },
        ],
      },
    } as any);
    expect(service.transcripts[0].artifactUrl).toEqual('https://cdn.example.com/captions/en.vtt');
    expect(service.transcripts[0].wordByWordUrl).toEqual('https://cdn.example.com/captions/en.vtt');
  });

  it('should call getPlayerOptions for streamingUrl ', () => {
    const service = TestBed.inject(ViewerService);
    service.streamingUrl = 'abc.com';
    // eslint-disable-next-line max-len
    service.artifactUrl = 'https://ntpproductionall.blob.core.windows.net/ntp-content-production/assets/do_3123348586389995521449/upload_a_video_file.mp4';
    service.artifactMimeType = 'video/mp4';
    const returnValue = service.getPlayerOptions();
    expect(returnValue).toBeDefined();
  });
  it('should call getPlayerOptions for null streamingUrl', () => {
    const service = TestBed.inject(ViewerService);
    service.streamingUrl = null;
    // eslint-disable-next-line @typescript-eslint/dot-notation
    spyOn(service['http'], 'head').and.returnValue(of(false));
    spyOn(service, 'raiseExceptionLog').and.callThrough();
    // eslint-disable-next-line max-len
    service.artifactUrl = 'https://ntpproductionall.blob.core.windows.net/ntp-content-production/assets/do_3123348586389995521449/upload_a_video_file.mp4';
    service.artifactMimeType = 'video/mp4';
    const returnValue = service.getPlayerOptions();
    expect(returnValue).toBeDefined();
  });
  it('should call getMarkers for interceptionPoints to be null value', () => {
    const service = TestBed.inject(ViewerService);
    service.interceptionPoints = null;
    const returnValue = service.getMarkers();
    expect(returnValue).toBeNull();
  });
  it('should call getMarkers for true showScore', () => {
    const service = TestBed.inject(ViewerService);
    service.interceptionPoints = { items: [{ identifier: '1234' }] };
    const returnValue = service.getMarkers();
    expect(returnValue).toEqual([({ time: undefined, type: undefined, identifier: '1234', duration: 3 })]);
    expect(service.showScore).toBeTruthy();
  });
  it('should call getMarkers for interceptionPoints to be an empty object', () => {
    const service = TestBed.inject(ViewerService);
    service.interceptionPoints = {};
    const returnValue = service.getMarkers();
    expect(returnValue).toBeNull();
  });
  it('should call getMarkers for interceptionPoints to contain items', () => {
    const service = TestBed.inject(ViewerService);
    service.interceptionPoints = { items: [{interceptionPoint: 20, identifier: '1234', type: 'QuestionSet'}] };
    const returnValue = service.getMarkers();
    expect(returnValue).toEqual([({ time: 20, type: 'QuestionSet', identifier: '1234', duration: 3 })]);
    expect(service.showScore).toBeTruthy();
  });
  it('should call raiseImpressionEvent', () => {
    const service = TestBed.inject(ViewerService);
    const videoPlayerService = TestBed.inject(SunbirdVideoPlayerService);
    spyOn(videoPlayerService, 'impression');
    service.raiseImpressionEvent('interactive-question-set', 'do_1221');
    expect(videoPlayerService.impression).toHaveBeenCalledWith('interactive-question-set', 'do_1221');
  });
  it('should call getQuestionSet and return null ', () => {
    const service = TestBed.inject(ViewerService);
    service.contentMap = {};
    service.questionCursor = null;
    const questionCursor = TestBed.inject(QuestionCursor);
    spyOn(questionCursor, 'getQuestionSet');
    const data =  service.getQuestionSet('do_1221');
    expect(data).toEqual(null);
  });
});

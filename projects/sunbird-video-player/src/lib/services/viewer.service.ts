import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable, Optional } from '@angular/core';
import { PlayerConfig, Transcripts } from '../playerInterfaces';
import { SunbirdVideoPlayerService } from '../sunbird-video-player.service';
import { UtilService } from './util.service';
import { errorCode , errorMessage } from '@project-sunbird/sunbird-player-sdk-v9';
import { QuestionCursor } from '@project-sunbird/sunbird-quml-player-v9';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as _ from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class ViewerService {

  public endPageSeen = false;
  public timeSpent = '0:0';
  private version = '1.0';
  public playerEvent = new EventEmitter<any>();
  public contentName: string;
  public showDownloadPopup: boolean;
  public streamingUrl: string;
  public mimeType: string;
  public artifactMimeType: string;
  public userName: string;
  public metaData: any;
  public PlayerLoadStartedAt: number;
  public totalLength;
  public currentlength;
  public totalSeekedLength = 0;
  public artifactUrl;
  public visitedLength = 0;
  public uniqueVisitedLength;
  public sidebarMenuEvent = new EventEmitter<any>();
  // Emits whenever transcripts are updated after initial load (e.g. a
  // generate-transcript job completing while the player is already mounted).
  // handleTranscriptsData() itself only recomputes from whatever is already
  // in `this.transcripts` - updateTranscripts() is the entry point for
  // pushing in genuinely new data from outside.
  public transcriptsUpdated = new EventEmitter<Transcripts>();
  public traceId: string;
  public isAvailableLocally = false;
  public interceptionPoints: any;
  public interceptionResponses: any = {};
  public showScore = false;
  public scoreObtained: any = 0;
  public maxScore: number;
  public playerInstance: any;
  public contentMap = {};
  public playerTimeSlots = [];
  public isEndEventRaised = false;
  public transcripts: Transcripts;
  public playBitStartTime = 0;
  public playBitEndTime = 0;
  // Set alongside isAvailableLocally in initialize() - reused by
  // updateTranscripts() so a transcript payload pushed in later (hot-reload)
  // gets the same offline basePath prefixing as the initial one.
  private localBasePath: string;
  constructor(private videoPlayerService: SunbirdVideoPlayerService,
              private utilService: UtilService,
              private http: HttpClient,
              @Optional() public questionCursor: QuestionCursor) {
    this.PlayerLoadStartedAt = new Date().getTime();
  }

  initialize({ context, config, metadata }: PlayerConfig) {
    this.contentName = metadata.name;
    this.isAvailableLocally = metadata.isAvailableLocally;
    this.streamingUrl = metadata.streamingUrl;
    this.artifactUrl = metadata.artifactUrl;
    this.mimeType = metadata.streamingUrl ? 'application/x-mpegURL' : metadata.mimeType;
    this.artifactMimeType = metadata.mimeType;
    this.isAvailableLocally = metadata.isAvailableLocally;
    this.traceId = config.traceId;
    this.interceptionPoints = metadata.interceptionPoints;
    if (context.userData) {
      const { userData: { firstName, lastName } } = context;
      this.userName = firstName === lastName ? firstName : `${firstName} ${lastName}`;
    }
    this.metaData = {
      actions: [
      ],
      volume: [],
      playBackSpeeds: [],
      totalDuration: 0,
      muted: undefined,
      currentDuration: undefined,
      transcripts: []
    };
    this.transcripts = metadata.transcripts ? metadata.transcripts : [];
    this.showDownloadPopup = false;
    this.endPageSeen = false;
    if (this.isAvailableLocally) {
      const basePath = (metadata.streamingUrl) ? (metadata.streamingUrl) : (metadata.basePath || metadata.baseDir);
      this.localBasePath = basePath;
      this.streamingUrl = `${basePath}/${metadata.artifactUrl}`;
      this.mimeType = metadata.mimeType;
      // Transcript/caption files ship inside the same offline .ecar bundle as
      // the video and are expected to be relative paths, same as
      // metadata.artifactUrl above - without this they'd resolve against the
      // page origin instead of the local content basePath and fail to load
      // when playing offline (e.g. downloaded content in the mobile app).
      this.transcripts = this.prefixTranscriptUrls(this.transcripts, basePath);
    }
  }

  private prefixTranscriptUrls(transcripts: Transcripts, basePath: string): Transcripts {
    if (!_.isArray(transcripts)) {
      return transcripts;
    }
    return transcripts.map((trans) => ({
      ...trans,
      artifactUrl: trans.artifactUrl ? `${basePath}/${trans.artifactUrl}` : trans.artifactUrl,
      wordByWordUrl: trans.wordByWordUrl ? `${basePath}/${trans.wordByWordUrl}` : trans.wordByWordUrl
    }));
  }
  handleTranscriptsData(selectedTranscripts) {
    this.metaData.transcripts = selectedTranscripts;
    if (!_.isArray(this.transcripts)) {
      this.raiseExceptionLog('INVALID_TRANSCRIPT_DATATYPE', 'TRANSCRIPT', new Error('Transcript data should be array'), this.traceId);
      return [];
    } else {
           _.forEach(this.transcripts, (value) => {
        if (!(_.some(this.transcripts, { language: value.language, artifactUrl: value.artifactUrl ,
          languageCode: value.languageCode, identifier: value.identifier}))) {
          this.raiseExceptionLog('TRANSCRIPT_DATA_MISSING', 'TRANSCRIPT',
           new Error('Transcript object dose not have required fields'), this.traceId);
          return [];
        } else if (!_.isEmpty(selectedTranscripts) &&
          ( _.last(selectedTranscripts) !== 'off' &&  _.last(selectedTranscripts) === value.languageCode)) {
          value.default = true;
        }
      });
    }
    return this.transcripts;
  }

  updateTranscripts(transcripts: Transcripts) {
    let newTranscripts = transcripts || [];
    if (this.isAvailableLocally && this.localBasePath) {
      newTranscripts = this.prefixTranscriptUrls(newTranscripts, this.localBasePath);
    }
    this.transcripts = newTranscripts;
    this.transcriptsUpdated.emit(this.transcripts);
  }
  async getPlayerOptions() {
    if (!this.streamingUrl) {
      return [{ src: this.artifactUrl, type: this.artifactMimeType }];
    } else {
      const data = await this.http.head(this.streamingUrl, { responseType: 'blob' }).toPromise().catch(error => {
        // eslint-disable-next-line max-len
        this.raiseExceptionLog(errorCode.streamingUrlSupport , errorMessage.streamingUrlSupport , new Error(`Streaming Url Not Supported  ${this.streamingUrl}`), this.traceId);
      });
      if (data) {
        return [{ src: this.streamingUrl, type: this.mimeType }];
      } else {
        return [{ src: this.artifactUrl, type: this.artifactMimeType }];
      }
    }
  }

  getMarkers()  {
    if (this?.interceptionPoints?.items) {
      try {
        const interceptionPoints = this.interceptionPoints;
        this.showScore = true;
        return interceptionPoints.items.map(({interceptionPoint, identifier, type}) => {
        return { time: interceptionPoint, type, identifier, duration: 3 };
        });
      } catch (error) {
        console.log(error);
        this.raiseExceptionLog('CPV2_CONT_INTERCEPTION_PARSE', 'error parsing the inteception points string', error, '');
        this.showScore = false;
      }
    }
    return null;
  }


  getQuestionSet(identifier) {
    const content = this.contentMap[identifier];
    if (!content) {
      if (!this.questionCursor) {
        return null;
      } else {
     return this.questionCursor.getQuestionSet(identifier)
     .pipe(map((response) => {
        this.contentMap[identifier] = response.questionSet;
        return this.contentMap[identifier];
       }));
      }
    } else {
      return of(content);
    }
  }

  preFetchContent() {
    const nextMarker = this.getNextMarker();
    if (nextMarker) {
      const identifier = nextMarker.identifier;
      this.getQuestionSet(nextMarker.identifier);
    }
  }

  getUniqueVisitedLength() {
    const uniqSecondsList = [];
    for (let slot of this.playerTimeSlots) {
        if(slot[0] < slot[1]) {
          let sec = slot[0];
          while ( sec <= slot[1]) {
            sec = Math.floor(sec)
            if(uniqSecondsList.indexOf(sec) == -1 && sec != 0) {
              uniqSecondsList.push(sec)
            }
            sec += 1
          }
        }
    }
      return uniqSecondsList.length;
  }

  getVisitedLength() {
    const secondsList = [];
    for (let slot of this.playerTimeSlots) {
        if(slot[0] < slot[1]) {
          let sec = slot[0];
          while ( sec <= slot[1]) {
            sec = Math.floor(sec)
            if(sec != 0) {
              secondsList.push(sec)
            }
            sec += 1
          }
        }
    }
      return secondsList.length;
  }

  getNextMarker() {
    const currentTime = this.playerInstance.currentTime();
    const markersList = this.getMarkers();
    if (!markersList) { return null; }

    return markersList.find(marker => {
      const markerTime = marker.time;
      return markerTime > currentTime;
    });
  }

  raiseStartEvent(event) {
    const duration = new Date().getTime() - this.PlayerLoadStartedAt;
    const startEvent = {
      eid: 'START',
      ver: this.version,
      edata: {
        type: 'START',
        mode: 'play',
        duration
      },
      metaData: this.metaData
    };
    this.playerEvent.emit(startEvent);
    this.videoPlayerService.start(duration);
    this.PlayerLoadStartedAt = new Date().getTime();
  }

  calculateScore() {
    this.scoreObtained =  Object.values(this.interceptionResponses).reduce(
      // eslint-disable-next-line @typescript-eslint/dot-notation
      (acc, response) => acc + response['score'] , 0);
  }

  raiseEndEvent(isOnPlayInterrupt = false) {

    if (!this.isEndEventRaised) {
      this.calculateScore();
      const duration = new Date().getTime() - this.PlayerLoadStartedAt;
      const endEvent = {
        eid: 'END',
        ver: this.version,
        edata: {
          type: 'END',
          currentTime: this.currentlength,
          totalTime: this.totalLength,
          duration
        },
        metaData: this.metaData
      };
      this.playerEvent.emit(endEvent);
      
      if(isOnPlayInterrupt) {
        this.playerTimeSlots.push([this.playBitStartTime, this.currentlength]);
      }
      this.uniqueVisitedLength = this.getUniqueVisitedLength();
      if(this.uniqueVisitedLength > this.totalLength) {
        this.uniqueVisitedLength = this.totalLength;
      }
      this.visitedLength = this.getVisitedLength();
      this.timeSpent = this.utilService.getTimeSpentText(this.visitedLength);
      
      this.videoPlayerService.end(
        duration,
        this.totalLength,
        this.currentlength,
        this.endPageSeen,
        this.totalSeekedLength,
        this.visitedLength,
        this.scoreObtained,
        this.uniqueVisitedLength
      );
      this.isEndEventRaised = true;
    }
  }


  raiseHeartBeatEvent(type: string, extraValues?) {
    if (type === 'REPLAY') {
      this.interceptionResponses = {};
      this.showScore = false;
      this.scoreObtained = 0;
      this.playerTimeSlots = [];
      this.playBitEndTime = 0;
      this.playBitStartTime = 0;
    }
    const hearBeatEvent = {
      eid: 'HEARTBEAT',
      ver: this.version,
      edata: {
        type,
        currentPage: 'videostage',
        extra: extraValues
      },
      metaData: this.metaData
    };
    this.playerEvent.emit(hearBeatEvent);
    this.videoPlayerService.heartBeat(hearBeatEvent);
    const interactItems = ['PLAY', 'PAUSE', 'EXIT', 'VOLUME_CHANGE', 'DRAG',
      'RATE_CHANGE', 'CLOSE_DOWNLOAD', 'DOWNLOAD', 'NAVIGATE_TO_PAGE',
      'NEXT', 'OPEN_MENU', 'PREVIOUS', 'CLOSE_MENU', 'DOWNLOAD_MENU', 'DOWNLOAD_POPUP_CLOSE', 'DOWNLOAD_POPUP_CANCEL',
      'SHARE', 'REPLAY', 'FORWARD', 'BACKWARD', 'FULLSCREEN', 'NEXT_CONTENT_PLAY', 'TRANSCRIPT_LANGUAGE_OFF',
      'TRANSCRIPT_LANGUAGE_SELECTED', 'VIDEO_MARKER_SELECTED'
    ];
    if (interactItems.includes(type)) {
      this.videoPlayerService.interact(type.toLowerCase(), 'videostage', extraValues);
    }
  }

  raiseImpressionEvent(pageId: string, cdata: any = {}) {
    this.videoPlayerService.impression(pageId, cdata);
  }

  // eslint-disable-next-line @typescript-eslint/no-shadow
  raiseExceptionLog(errorCode: string, errorType: string, stacktrace, traceId) {
    const exceptionLogEvent = {
      eid: 'ERROR',
      edata: {
        err: errorCode,
        errtype: errorType,
        requestid: traceId || '',
        stacktrace: (stacktrace && stacktrace.toString()) || '',
      }
    };
    this.playerEvent.emit(exceptionLogEvent);
    this.videoPlayerService.error(errorCode , errorType , stacktrace);
  }

}

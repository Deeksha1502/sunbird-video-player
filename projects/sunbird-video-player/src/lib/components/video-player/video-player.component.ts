import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, OnChanges, SimpleChanges,
   Renderer2, ViewChild, ViewEncapsulation, OnInit, Optional, ChangeDetectorRef } from '@angular/core';
import { QuestionCursor } from '@project-sunbird/sunbird-quml-player-v9';
import * as _ from 'lodash-es';
import videojs from 'video.js';
import 'videojs-contrib-quality-levels';
import videojshttpsourceselector from 'videojs-http-source-selector';
import { Subscription } from 'rxjs';
import { ViewerService } from '../../services/viewer.service';
import { IAction } from '../../playerInterfaces';

@Component({
  // eslint-disable-next-line @angular-eslint/prefer-standalone
  standalone: false,
  selector: 'video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements AfterViewInit, OnInit, OnDestroy, OnChanges {
  @Input() config: any;
  @Input() action?: IAction;
  @Output() questionSetData = new EventEmitter();
  @Output() playerInstance = new EventEmitter();
  transcripts = [];
  showBackwardButton = false;
  showForwardButton = false;
  showPlayButton = true;
  showPauseButton = false;
  showControls = true;
  currentPlayerState = 'none';
  private unlistenTargetMouseMove: () => void;
  private unlistenTargetTouchStart: () => void;
  @ViewChild('target', { static: true }) target: ElementRef;
  @ViewChild('controlDiv', { static: true }) controlDiv: ElementRef;
  @ViewChild('wordHighlightOverlay', { static: true }) wordHighlightOverlay: ElementRef;
  @ViewChild('wordHighlightLine', { static: true }) wordHighlightLine: ElementRef;
  player: any;
  totalSeekedLength = 0;
  previousTime = 0;
  currentTime = 0;
  seekStart = null;
  time = 10;
  startTime;
  totalSpentTime = 0;
  isAutoplayPrevented = false;
  setMetaDataConfig = false;
  totalDuration = 0;
  disablePictureInPicture = false;
  showWordHighlightOverlay = false;
  private activeWordTrack: any = null;
  private wordHighlightCues: any[] = [];
  private wordHighlightCueIndex = 0;
  private wordHighlightLineWords: string[] = [];
  private wordHighlightLastCueEnd = 0;
  // Configurable via config.wordHighlight - see ngOnInit.
  private wordHighlightGapThresholdSeconds = 0.3;
  // Independent ceiling on top of the gap-based clearing above - ASR-generated
  // word-level VTTs can have zero gap between contiguous cues for an entire
  // monologue, in which case the gap check alone never fires and the line
  // grows without bound (observed with real word-by-word Urdu captions).
  // Netflix's per-line character cap (~42) is used as that ceiling - a
  // reading-speed-based duration cap was tried and reverted: it compares
  // against elapsed *speech* time, which is inherently slower per-character
  // than any reasonable reading speed, so it would clear the line almost
  // immediately after every single word.
  private wordHighlightMaxLineCharacters = 42;
  // Tracks every <track> currently attached via player.addRemoteTextTrack(),
  // keyed by `${kind}|${languageCode}`. video.js's removeRemoteTextTrack()
  // only works on tracks added this way (not on statically-declared HTML
  // <track> elements) - so ALL transcript tracks, including the first ones
  // loaded, go through this same path. That's what makes it possible to
  // cleanly add/remove tracks later when transcriptsUpdated fires (e.g. a
  // transcript finishing generation while the player is already mounted),
  // without duplicating or leaking tracks.
  private attachedTextTracks = new Map<string, any>();
  private transcriptsUpdatedSubscription: Subscription;


  constructor(public viewerService: ViewerService, private renderer2: Renderer2,
              @Optional()public questionCursor: QuestionCursor, private http: HttpClient, public cdr: ChangeDetectorRef ) { }
  ngOnInit() {
    this.disablePictureInPicture = _.get(this.config, 'disablePictureInPictureMode', false);
    this.transcripts = this.viewerService.handleTranscriptsData(_.get(this.config, 'transcripts') || []);
    this.wordHighlightGapThresholdSeconds = _.get(this.config, 'wordHighlight.gapThresholdSeconds', 0.3);
    this.wordHighlightMaxLineCharacters = _.get(this.config, 'wordHighlight.maxLineCharacters', 42);
  }
  ngAfterViewInit() {
    this.viewerService.getPlayerOptions().then(async (options) => {
      this.player = await videojs(this.target.nativeElement, {
        fluid: true,
        responsive: true,
        sources: options,
        autoplay: true,
        muted: _.get(this.config, 'muted'),
        playbackRates: [0.5, 1, 1.5, 2],
        controlBar: {
          children: ['playToggle', 'volumePanel', 'durationDisplay',
            'progressControl', 'remainingTimeDisplay', 'CaptionsButton',
            'playbackRateMenuButton', 'fullscreenToggle']
        },
        plugins: {
          httpSourceSelector:
          {
            default: 'low'
          }
        },
        html5: {
          hls: {
            overrideNative: true
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        }
      } as any);
      this.player.videojshttpsourceselector = videojshttpsourceselector;
      this.player.videojshttpsourceselector();
      // player.addRemoteTextTrack() silently returns undefined if called
      // before player.tech_ is attached - not guaranteed yet just because the
      // videojs(...) promise above has resolved. player.ready() is the
      // documented-safe point to call it.
      this.player.ready(() => {
        this.attachTranscriptTracks(this.transcripts);
      });
      this.transcriptsUpdatedSubscription = this.viewerService.transcriptsUpdated.subscribe((updated) => {
        this.syncTranscriptTracks(updated);
      });
      const markers = this.viewerService.getMarkers();

      if (markers && markers.length > 0) {
        const identifiers = markers.map(item => {
          return item.identifier;
        });
        if (this.viewerService.questionCursor) {
        this.viewerService.questionCursor.getAllQuestionSet(identifiers).subscribe(
          (response) => {
            if (!_.isEmpty(response)) {
              this.viewerService.maxScore = response.reduce((a, b) => a + b, 0);
            }
          }
        );
      }
    }

      if (markers) {
        this.player.markers({
          markers,
          markerStyle: {
            height: '7px',
            bottom: '39%',
            'background-color': 'orange'
          },
          onMarkerReached: (marker) => {
            if (marker) {
              const { time, text, identifier, duration } = marker;
              if (!(this.player.currentTime() > (time + duration))) {
                setTimeout(() => {
                  this.pause();
                  this.player.controls(false);
                }, 1000);
                this.viewerService.getQuestionSet(identifier).subscribe(
                  (response) => {
                    this.questionSetData.emit({ response, time, identifier });
                  }, (error) => {
                    this.play();
                    this.player.controls(true);
                    console.log(error);
                  }
                );
              }
            }
          }
        });
        this.playerInstance.emit(this.player);
        this.viewerService.playerInstance = this.player;
        this.viewerService.preFetchContent();
      }
      this.registerEvents();
    });

    setInterval(() => {
      if (!this.isAutoplayPrevented && this.currentPlayerState !== 'pause') {
        this.showControls = false;
      }
    }, 5000);

    this.unlistenTargetMouseMove = this.renderer2.listen(this.target.nativeElement, 'mousemove', () => {
      this.showControls = true;
    });
    this.unlistenTargetTouchStart = this.renderer2.listen(this.target.nativeElement, 'touchstart', () => {
      this.showControls = true;
    });

    this.viewerService.sidebarMenuEvent.subscribe(event => {
      if (event === 'OPEN_MENU') { this.pause(); }
      if (event === 'CLOSE_MENU') { this.play(); }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.action && this.player) {
      if (changes.action.currentValue !== changes.action.previousValue) {
        switch (changes.action.currentValue.name) {
            case 'play':
                        this.play();
                        break;
            case 'pause':
                        this.pause();
                        break;
            default: console.warn('Invalid Case!');
        }
      }
    }
  }

  onLoadMetadata(e) {
    this.totalDuration = this.viewerService.metaData.totalDuration = this.player.duration();
    this.viewerService.totalLength = this.totalDuration;
    if (this.transcripts && this.transcripts.length && this.player.transcript) {
      this.player.transcript({
        showTitle: true,
        showTrackSelector: true,
      });
    }
  }

  registerEvents() {
    const promise = this.player.play();
    if (promise !== undefined) {
      promise.catch(error => {
        this.isAutoplayPrevented = true;
      });
    }

    const events = ['loadstart', 'play', 'pause',
      'error', 'playing', 'progress', 'seeked', 'seeking', 'volumechange',
      'ratechange'];

    this.player.on('fullscreenchange', (data) => {
      // This code is to show the controldiv (and the word-highlight overlay,
      // for the same reason) in fullscreen mode - entering fullscreen only
      // renders the fullscreen element and its descendants, and both of these
      // are siblings of <video> rather than descendants of it.
      if (this.player.isFullscreen()) {
        this.target.nativeElement.parentNode.appendChild(this.controlDiv.nativeElement);
        this.target.nativeElement.parentNode.appendChild(this.wordHighlightOverlay.nativeElement);
      }
      this.viewerService.raiseHeartBeatEvent('FULLSCREEN');
    });

    this.player.on('pause', (data) => {
      this.pause();
    });

    this.player.on('ratechange', (data) => {
      this.viewerService.metaData.playBackSpeeds.push(this.player.playbackRate());
    });

    this.player.on('volumechange', (data) => {
      this.viewerService.metaData.volume.push(this.player.volume());
      this.viewerService.metaData.muted = this.player.muted();
    });

    this.player.on('play', (data) => {
      this.currentPlayerState = 'play';
      this.showPauseButton = true;
      this.showPlayButton = false;
      this.viewerService.raiseHeartBeatEvent('PLAY');
      this.isAutoplayPrevented = false;
    });

    this.player.on('timeupdate', (data) => {
      this.viewerService.metaData.currentDuration = this.player.currentTime();
      this.handleVideoControls(data);
      this.viewerService.playerEvent.emit(data);
      this.viewerService.currentlength = this.viewerService.metaData.currentDuration;
      this.totalSpentTime += new Date().getTime() - this.startTime;
      this.startTime = new Date().getTime();
      this.updateWordHighlightOverlay(this.player.currentTime());
      const remainingTime = Math.floor(this.totalDuration - this.player.currentTime());
      if (remainingTime <= 0) {
            this.viewerService.metaData.currentDuration = 0;
            this.handleVideoControls({ type: 'ended' });
            this.viewerService.playerEvent.emit({ type: 'ended' });
      }
    });
    this.player.on('seeked', (data) => {
      this.rebuildWordHighlightAt(this.player.currentTime());
    });
    this.player.on('subtitleChanged', (event, track) => {
      this.handleEventsForTranscripts(track);
    });

    this.player.on('durationchange', (data) => {
      if (this.totalDuration === 0) {
        this.totalDuration = this.viewerService.metaData.totalDuration = this.player.duration();
        this.viewerService.playerEvent.emit({ ...data, duration: this.totalDuration });
      }
    });

    events.forEach(event => {
      this.player.on(event, (data) => {
        this.handleVideoControls(data);
        this.viewerService.playerEvent.emit(data);
      });
    });
    this.trackTranscriptEvent();
  }
  trackTranscriptEvent() {
    let timeout;
    const player = this.player;
    this.player.textTracks().on('change', function action(event) {
      clearTimeout(timeout);
      let transcriptObject = {};
      this.tracks_.filter((track) => {
        if ((track.kind === 'captions' || track.kind === 'subtitles') && track.mode === 'showing') {
          transcriptObject = { artifactUrl: track.src, languageCode: track.language };
          return true;
        }
      });
      timeout = setTimeout(() => {
        player.trigger('subtitleChanged', transcriptObject);
      }, 10);
    });
  }
  private trackKey(kind: string, languageCode: string): string {
    return `${kind}|${languageCode}`;
  }

  private addTranscriptTrack(kind: 'captions' | 'metadata', trans: any) {
    const src = kind === 'captions' ? trans.artifactUrl : trans.wordByWordUrl;
    const sourceSuffix = trans.sourceLanguage ? ' (Original)' : '';
    const label = kind === 'captions' ? `${trans.language}${sourceSuffix}` : `${trans.language} (word-by-word)`;
    const isDefault = kind === 'captions' ? !!trans.default : false;
    const trackEl = this.player.addRemoteTextTrack({
      kind,
      src,
      srclang: trans.languageCode,
      label,
      default: isDefault
    }, false);
    if (!trackEl) {
      return;
    }
    // The native `default` attribute is only auto-honored by the browser
    // during a media element's INITIAL text-track processing. Tracks added
    // imperatively via addRemoteTextTrack() after the player/tech is already
    // set up (which is every track now, including the first ones - see the
    // note on attachedTextTracks) don't get that automatic pass, so it has to
    // be forced here explicitly or the "default" language would never show
    // without the viewer manually opening the CC menu.
    if (isDefault && trackEl.track) {
      trackEl.track.mode = 'showing';
    }
    this.attachedTextTracks.set(this.trackKey(kind, trans.languageCode), trackEl.track);
  }

  private attachTranscriptTracks(transcripts: any[]) {
    (transcripts || []).forEach((trans) => {
      this.addTranscriptTrack('captions', trans);
      if (trans.wordByWordUrl) {
        this.addTranscriptTrack('metadata', trans);
      }
    });
  }

  private findShowingCaptionsLanguage(): string {
    const tracks = this.player.textTracks();
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if ((track.kind === 'captions' || track.kind === 'subtitles') && track.mode === 'showing') {
        return track.language;
      }
    }
    return null;
  }

  // Reconciles the live player's attached tracks against a freshly-updated
  // transcripts array (see ViewerService.transcriptsUpdated) - e.g. a
  // transcript that finishes generating while the preview/player is already
  // mounted and playing. Removes tracks no longer present, adds new ones,
  // and re-arms the word-highlight overlay if a wordByWordUrl just became
  // available for the language currently showing.
  private syncTranscriptTracks(rawTranscripts: any[]) {
    const selected = _.get(this.config, 'transcripts') || [];
    const newTranscripts = this.viewerService.handleTranscriptsData(selected);
    const desiredKeys = new Set<string>();
    (newTranscripts || []).forEach((trans) => {
      desiredKeys.add(this.trackKey('captions', trans.languageCode));
      if (trans.wordByWordUrl) {
        desiredKeys.add(this.trackKey('metadata', trans.languageCode));
      }
    });
    Array.from(this.attachedTextTracks.keys()).forEach((key) => {
      if (!desiredKeys.has(key)) {
        const track = this.attachedTextTracks.get(key);
        this.player.removeRemoteTextTrack(track);
        this.attachedTextTracks.delete(key);
      }
    });
    const showingLanguage = this.findShowingCaptionsLanguage();
    (newTranscripts || []).forEach((trans) => {
      if (!this.attachedTextTracks.has(this.trackKey('captions', trans.languageCode))) {
        this.addTranscriptTrack('captions', trans);
      }
      if (trans.wordByWordUrl && !this.attachedTextTracks.has(this.trackKey('metadata', trans.languageCode))) {
        this.addTranscriptTrack('metadata', trans);
        if (!this.activeWordTrack && showingLanguage === trans.languageCode) {
          this.activateWordHighlightTrack(trans.languageCode);
        }
      }
    });
    this.transcripts = newTranscripts;
  }

  handleEventsForTranscripts(track) {
    let telemetryObject;
    if (!_.isEmpty(track)) {
      telemetryObject = {
        type: 'TRANSCRIPT_LANGUAGE_SELECTED',
        extraValues: {
          transcript: {
            language: _.get(_.filter(this.transcripts, { artifactUrl: track.artifactUrl, languageCode: track.languageCode })[0], 'language')
          },
          videoTimeStamp: this.player.currentTime()
        }
      };
      if (_.last(this.viewerService.metaData.transcripts) !== track.languageCode) {
        this.viewerService.metaData.transcripts.push(track.languageCode);
      }
      this.activateWordHighlightTrack(track.languageCode);
    } else {
      telemetryObject = {
        type: 'TRANSCRIPT_LANGUAGE_OFF',
        extraValues: {
          videoTimeStamp: this.player.currentTime()
        }
      };
      this.viewerService.metaData.transcripts.push('off');
      this.deactivateWordHighlightTrack();
    }
    this.viewerService.raiseHeartBeatEvent(telemetryObject.type, telemetryObject.extraValues);
  }

  // Finds a same-language word-level track and arms it as the active source
  // for the overlay. This never hides native captions by itself - visibility
  // is entirely decided by updateWordHighlightOverlay/rebuildWordHighlightAt
  // finding real words to show. That means a wordByWordUrl that's missing,
  // 404s, is empty/malformed, or simply doesn't cover part of the video needs
  // no special-case detection: native captions just keep showing whenever the
  // overlay has nothing, with no timers or video.js-internal load/error
  // events involved.
  private activateWordHighlightTrack(languageCode: string) {
    const textTracks = this.player.textTracks();
    let wordTrack = null;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (track.kind === 'metadata' && track.language &&
        track.language.toLowerCase() === languageCode.toLowerCase()) {
        wordTrack = track;
        break;
      }
    }
    if (this.activeWordTrack && this.activeWordTrack !== wordTrack) {
      this.activeWordTrack.mode = 'disabled';
    }
    this.activeWordTrack = wordTrack;
    this.resetWordHighlightState();
    if (!wordTrack) {
      return;
    }
    wordTrack.mode = 'hidden';
    // In case cues are already loaded (e.g. re-enabling a track the user had
    // on before) and playback is already mid-video, position the overlay
    // immediately instead of waiting for the next timeupdate tick to sweep
    // forward from the start of the cue list.
    this.rebuildWordHighlightAt(this.player.currentTime());
  }

  private deactivateWordHighlightTrack() {
    if (this.activeWordTrack) {
      this.activeWordTrack.mode = 'disabled';
    }
    this.activeWordTrack = null;
    this.resetWordHighlightState();
    this.renderWordHighlightLine();
  }

  private resetWordHighlightState() {
    this.wordHighlightCues = [];
    this.wordHighlightCueIndex = 0;
    this.wordHighlightLineWords = [];
    this.wordHighlightLastCueEnd = 0;
    this.setWordHighlightOverlayVisible(false);
  }

  // video.js does not keep our Angular-rendered <video class="video-js"> tag
  // as its final DOM root - it builds its own tech/wrapper structure - so an
  // Angular class binding on that original element does not reliably reach
  // the same ancestor as the dynamically-created .vjs-text-track-display.
  // player.addClass/removeClass operate on the tech's actual live root
  // element, which is what the ::ng-deep hide rule needs to match against.
  private setWordHighlightOverlayVisible(visible: boolean) {
    if (this.showWordHighlightOverlay === visible) { return; }
    this.showWordHighlightOverlay = visible;
    if (!this.player) { return; }
    if (visible) {
      this.player.addClass('word-highlight-active');
    } else {
      this.player.removeClass('word-highlight-active');
    }
  }

  private ensureWordHighlightCuesLoaded() {
    if (!this.activeWordTrack || this.wordHighlightCues.length > 0 ||
      !this.activeWordTrack.cues || this.activeWordTrack.cues.length === 0) {
      return;
    }
    this.wordHighlightCues = Array.from(this.activeWordTrack.cues as any).sort((a: any, b: any) => a.startTime - b.startTime);
  }

  private updateWordHighlightOverlay(currentTime: number) {
    if (!this.activeWordTrack) { return; }
    this.ensureWordHighlightCuesLoaded();
    let changed = false;
    while (this.wordHighlightCueIndex < this.wordHighlightCues.length &&
      this.wordHighlightCues[this.wordHighlightCueIndex].startTime <= currentTime) {
      const cue = this.wordHighlightCues[this.wordHighlightCueIndex];
      const gapBroken = cue.startTime - this.wordHighlightLastCueEnd > this.wordHighlightGapThresholdSeconds;
      const prospectiveLength = this.wordHighlightLineWords.length === 0
        ? cue.text.length
        : this.wordHighlightLineWords.join(' ').length + 1 + cue.text.length;
      const tooManyChars = this.wordHighlightLineWords.length > 0 &&
        prospectiveLength > this.wordHighlightMaxLineCharacters;
      if (gapBroken || tooManyChars) {
        this.wordHighlightLineWords = [];
      }
      this.wordHighlightLastCueEnd = cue.endTime;
      this.wordHighlightLineWords.push(cue.text);
      this.wordHighlightCueIndex += 1;
      changed = true;
    }
    // No new cue consumed this tick, but the last known word ended long
    // enough ago (natural sentence gap, end of this VTT's coverage, or a VTT
    // that never covered this part of the video at all) - clear the stale
    // line so native captions take back over instead of freezing forever.
    if (!changed && this.wordHighlightLineWords.length > 0 &&
      (currentTime - this.wordHighlightLastCueEnd) > this.wordHighlightGapThresholdSeconds) {
      this.wordHighlightLineWords = [];
      changed = true;
    }
    if (changed) {
      this.renderWordHighlightLine();
    }
    this.setWordHighlightOverlayVisible(this.wordHighlightLineWords.length > 0);
  }

  private rebuildWordHighlightAt(currentTime: number) {
    if (!this.activeWordTrack) { return; }
    this.ensureWordHighlightCuesLoaded();
    this.wordHighlightCueIndex = 0;
    while (this.wordHighlightCueIndex < this.wordHighlightCues.length &&
      this.wordHighlightCues[this.wordHighlightCueIndex].startTime <= currentTime) {
      this.wordHighlightCueIndex += 1;
    }
    this.wordHighlightLineWords = [];
    this.wordHighlightLastCueEnd = 0;
    let start = this.wordHighlightCueIndex - 1;
    let charCount = start >= 0 ? this.wordHighlightCues[start].text.length : 0;
    while (start >= 0) {
      const gapBefore = start > 0
        ? this.wordHighlightCues[start].startTime - this.wordHighlightCues[start - 1].endTime
        : Infinity;
      const prospectiveCharCount = start > 0 ? charCount + 1 + this.wordHighlightCues[start - 1].text.length : Infinity;
      const tooManyChars = start > 0 && prospectiveCharCount > this.wordHighlightMaxLineCharacters;
      if (gapBefore > this.wordHighlightGapThresholdSeconds || tooManyChars) { break; }
      charCount = prospectiveCharCount;
      start -= 1;
    }
    // Only treat the reconstructed line as still "live" if its last word's
    // cue hasn't already ended beyond the gap threshold relative to
    // currentTime - keeps seek behavior consistent with normal playback
    // rather than showing a stale line the moment cues run out.
    const lastIndex = this.wordHighlightCueIndex - 1;
    if (lastIndex >= 0 && (currentTime - this.wordHighlightCues[lastIndex].endTime) <= this.wordHighlightGapThresholdSeconds) {
      for (let i = Math.max(start, 0); i <= lastIndex; i++) {
        this.wordHighlightLineWords.push(this.wordHighlightCues[i].text);
        this.wordHighlightLastCueEnd = this.wordHighlightCues[i].endTime;
      }
    }
    this.renderWordHighlightLine();
    this.setWordHighlightOverlayVisible(this.wordHighlightLineWords.length > 0);
  }

  private renderWordHighlightLine() {
    if (!this.wordHighlightLine) { return; }
    // Only bold the last word when there are other words on the same line to
    // contrast it against - for sentence-level VTTs (no real word-level
    // timing) each line is just a single whole-sentence cue, so marking that
    // sole item "current" would bold the entire sentence instead of
    // highlighting anything meaningful.
    const highlightLast = this.wordHighlightLineWords.length > 1;
    this.wordHighlightLine.nativeElement.innerHTML = this.wordHighlightLineWords
      .map((word, i) => (highlightLast && i === this.wordHighlightLineWords.length - 1)
        ? `<span class="word-highlight-word--current">${this.escapeHtml(word)}</span>`
        : this.escapeHtml(word))
      .join(' ');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  toggleForwardRewindButton() {
    this.showForwardButton = true;
    this.showBackwardButton = true;
    this.cdr.detectChanges();
    if ((this.player.currentTime() + this.time) > this.totalDuration) {
      this.showForwardButton = false;
      this.cdr.detectChanges();
    }
    if ((this.player.currentTime() - this.time) < 0) {
      this.showBackwardButton = false;
      this.cdr.detectChanges();
    }
  }

  play() {
    if (this.player) {
      this.player.play();
    }
    this.currentPlayerState = 'play';
    this.showPauseButton = true;
    this.showPlayButton = false;
    this.toggleForwardRewindButton();
  }

  pause() {
    if (this.player) {
      this.player.pause();
    }
    this.currentPlayerState = 'pause';
    this.showPauseButton = false;
    this.showPlayButton = true;
    this.toggleForwardRewindButton();
    this.viewerService.raiseHeartBeatEvent('PAUSE');
  }

  backward() {
    if (this.player) {
      this.player.currentTime(this.player.currentTime() - this.time);
    }
    this.toggleForwardRewindButton();
    this.viewerService.raiseHeartBeatEvent('BACKWARD');
  }

  forward() {
    if (this.player) {
      this.player.currentTime(this.player.currentTime() + this.time);
    }
    this.toggleForwardRewindButton();
    this.viewerService.raiseHeartBeatEvent('FORWARD');
  }

  handleVideoControls({ type }) {
    if (type === 'playing') {
      this.showPlayButton = false;
      this.showPauseButton = true;
      if (this.setMetaDataConfig) {
        this.setMetaDataConfig = false;
        this.setPreMetaDataConfig();
      }
    }
    if (type === 'ended') {
      this.totalSpentTime += new Date().getTime() - this.startTime;
      if (this.player) {
        this.viewerService.currentlength = this.player.currentTime();
      }
      this.viewerService.totalLength = this.totalDuration;
      this.updatePlayerEventsMetadata({ type });
      this.viewerService.playBitEndTime = this.totalDuration;
      this.viewerService.playerTimeSlots.push([this.viewerService.playBitStartTime, this.viewerService.playBitEndTime])
    }
    if (type === 'pause') {
      this.totalSpentTime += new Date().getTime() - this.startTime;
      this.updatePlayerEventsMetadata({ type });
      this.viewerService.playBitEndTime = this.previousTime
      this.viewerService.playerTimeSlots.push([this.viewerService.playBitStartTime, this.viewerService.playBitEndTime])
    }
    if (type === 'play') {
      this.startTime = new Date().getTime();
      if(this.player?.currentTime()) {
        this.viewerService.playBitStartTime  = this.player?.currentTime()
      }
      this.updatePlayerEventsMetadata({ type });
    }

    if (type === 'loadstart') {
      this.startTime = new Date().getTime();
      this.setMetaDataConfig = true;
    }

    // Calculating total seeked length
    if (type === 'timeupdate') {
      this.previousTime = this.currentTime;
      if (this.player) {
      this.currentTime = this.player.currentTime();
      }
      this.toggleForwardRewindButton();
    }
    if (type === 'seeking') {
      if (this.seekStart === null) { this.seekStart = this.previousTime; }
    }
    if (type === 'seeked') {
      this.updatePlayerEventsMetadata({ type });
      if (this.currentTime > this.seekStart) {
        this.totalSeekedLength = this.totalSeekedLength + (this.currentTime - this.seekStart);
      } else if (this.seekStart > this.currentTime) {
        this.totalSeekedLength = this.totalSeekedLength + (this.seekStart - this.currentTime);
      }
      this.viewerService.totalSeekedLength = this.totalSeekedLength;
      this.seekStart = null;
      if (this.player.markers && this.player.markers.getMarkers) {
        const markers = this.player.markers.getMarkers();
        markers.forEach(marker => {
          if (!this.viewerService.interceptionResponses[marker.time] && marker.time < this.currentTime) {
            this.viewerService.interceptionResponses[marker.time] = {
              score: 0,
              isSkipped: false
            };
            // eslint-disable-next-line @typescript-eslint/dot-notation
            document.querySelector(`[data-marker-time="${marker.time}"]`)['style'].backgroundColor = 'red';
          }
        });
      }
    }
  }

  setPreMetaDataConfig() {
    if (!_.isEmpty(_.get(this.config, 'volume'))) {
      this.player.volume(_.last(_.get(this.config, 'volume')));
    }
    if (_.get(this.config, 'currentDuration')) {
      this.player.currentTime(_.get(this.config, 'currentDuration'));
      this.viewerService.playBitStartTime = _.get(this.config, 'currentDuration')
    }
    if (!_.isEmpty(_.get(this.config, 'playBackSpeeds'))) {
      this.player.playbackRate(_.last(_.get(this.config, 'playBackSpeeds')));
    }
  }

  updatePlayerEventsMetadata({ type }) {
    const action = {};
    action[type + ''] = this.player.currentTime();
    this.viewerService.metaData.actions.push(action);
  }

  ngOnDestroy() {
    if (this.transcriptsUpdatedSubscription) {
      this.transcriptsUpdatedSubscription.unsubscribe();
    }
    if (this.player) {
      this.player.dispose();
    }
    this.unlistenTargetMouseMove();
    this.unlistenTargetTouchStart();
  }
}

import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { QuestionCursor } from '@project-sunbird/sunbird-quml-player-v9';
import { forkJoin, Observable, of, throwError as observableThrowError } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
@Injectable()
export class QCImplementationService implements QuestionCursor {
    listUrl; // Define this url to call list api in server
    questionSetBaseUrl;

    constructor(@Inject(DOCUMENT) private document: Document, private http: HttpClient) {
        this.listUrl = (document.defaultView as any).questionListUrl;
        this.questionSetBaseUrl = (document.defaultView as any).questionSetBaseUrl;
    }

    getQuestionSet(identifier) {
        if (this.questionSetBaseUrl) {
            const hierarchy = this.http.get(`${this.questionSetBaseUrl}/v1/hierarchy/${identifier}`);
            const questionSet = this.http.get(`${this.questionSetBaseUrl}/v1/read/${identifier}?fields=instructions`);
            return (
                forkJoin([hierarchy, questionSet]).pipe(
                    map((res: any) => {
                        const qs: any = res[0].result.questionSet;
                        return { qs };
                    })
                ));

        }
    }

    getAllQuestionSet(identifiers) {
        const requests = identifiers.map(id => {
            return this.http.get(`${this.questionSetBaseUrl}/v1/hierarchy/${id}?fields=maxScore`);
        });
        return forkJoin(requests).pipe(
            map((res: any) => {
                return res.map((item: any) => item.result.questionSet.maxScore);
            })
        );
    }

    getQuestions(identifiers: string[]): Observable<any> {
        if (this.listUrl) {
            const option: any = {
                url: this.listUrl,
                data: {
                    request: {
                        search: { identifier: identifiers }
                    }
                }
            };
            return this.post(option).pipe(map((data) => {
                return data.result;
            }));
        }
    }

    getQuestion(identifier: string): Observable<any> {
        if (this.listUrl) {
            const option: any = {
                url: this.listUrl,
                data: {
                    request: {
                        search: { identifier: [identifier] }
                    }
                }
            };
            return this.post(option).pipe(map((data) => {
                return data.result;
            }));
        }
    }

    private post(requestParam): Observable<any> {
        const httpOptions = {
            headers: { 'Content-Type': 'application/json' }
        };
        return this.http.post(requestParam.url, requestParam.data, httpOptions).pipe(
            mergeMap((data: any) => {
                if (data.responseCode !== 'OK') {
                    return observableThrowError(data);
                }
                return of(data);
            }));
    }
}

import { QuestionCursor } from '@project-sunbird/sunbird-quml-player-v9';
import { HttpClient } from '@angular/common/http';
import { mergeMap, map } from 'rxjs/operators';
import { of, throwError as observableThrowError, Observable, forkJoin } from 'rxjs';
import * as _ from 'lodash-es';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable()
export class QuestionCursorImplementationService implements QuestionCursor {
    baseUrl = environment.baseUrl;
    listUrl = 'action/question/v1/list';
    constructor(private http: HttpClient) { }

    getQuestionSet(identifier) {
        const hierarchy = this.http.get(`${this.baseUrl}/learner/questionset/v1/hierarchy/${identifier}`);
        const questionSet = this.http.get(`${this.baseUrl}/api/questionset/v1/read/${identifier}?fields=instructions`);
        return (
            forkJoin([hierarchy, questionSet]).pipe(
                map(res => {
                    // tslint:disable-next-line:no-shadowed-variable
                    const questionSet = _.get(res[0], 'result.questionSet');
                    if (_.get(res[1], 'result.questionset.instructions') && questionSet) {
                        // tslint:disable-next-line:no-unused-expression
                        questionSet.instructions;
                    }
                    return { questionSet };
                })
            ));
    }

    getAllQuestionSet(identifiers) {
        const requests = identifiers.map(id => {
            return this.http.get(`${this.baseUrl}/learner/questionset/v1/hierarchy/${id}?fields=maxScore`);
        });
        return forkJoin(requests).pipe(
            map((res:any) => {
                return res.map(item => _.get(item, 'result.questionSet.maxScore'));
            })
        );
    }

    getQuestions(identifiers: string[]): Observable<any> {
        const option: any = {
            url: `${this.baseUrl}/api/question/v1/list`,
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

    getQuestion(identifier: string): Observable<any> {
        const option: any = {
            url: `${this.baseUrl}/api/question/v1/list`,
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

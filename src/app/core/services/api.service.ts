import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get<T>(path: string, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.toHttpParams(params) });
  }

  post<T>(path: string, body: unknown, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<T> {
    return this.http.post<T>(this.url(path), body, { params: this.toHttpParams(params) });
  }

  postText(path: string, body: unknown, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<string> {
    return this.http.post(this.url(path), body, { params: this.toHttpParams(params), responseType: 'text' });
  }

  put<T>(path: string, body: unknown, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<T> {
    return this.http.put<T>(this.url(path), body, { params: this.toHttpParams(params) });
  }

  putText(path: string, body: unknown, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<string> {
    return this.http.put(this.url(path), body, { params: this.toHttpParams(params), responseType: 'text' });
  }

  patch<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<T> {
    return this.http.patch<T>(this.url(path), body ?? {}, { params: this.toHttpParams(params) });
  }

  patchText(path: string, body?: unknown, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<string> {
    return this.http.patch(this.url(path), body ?? {}, { params: this.toHttpParams(params), responseType: 'text' });
  }

  delete<T>(path: string, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<T> {
    return this.http.delete<T>(this.url(path), { params: this.toHttpParams(params) });
  }

  deleteText(path: string, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<string> {
    return this.http.delete(this.url(path), { params: this.toHttpParams(params), responseType: 'text' });
  }

  getText(path: string, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<string> {
    return this.http.get(this.url(path), { params: this.toHttpParams(params), responseType: 'text' });
  }

  upload<T>(path: string, formData: FormData, params?: Record<string, string | number | boolean | Array<string | number> | undefined>): Observable<T> {
    return this.http.post<T>(this.url(path), formData, { params: this.toHttpParams(params) });
  }

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private toHttpParams(params?: Record<string, string | number | boolean | Array<string | number> | undefined>): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          httpParams = httpParams.append(key, String(item));
        }
        continue;
      }

      httpParams = httpParams.set(key, String(value));
    }

    return httpParams;
  }
}
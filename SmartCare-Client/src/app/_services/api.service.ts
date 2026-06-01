import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../_models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${path}`).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => this.handleError(err)),
    );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}/${path}`, body).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => this.handleError(err)),
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}/${path}`, body).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => this.handleError(err)),
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}/${path}`).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => this.handleError(err)),
    );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      const detail = res.errors?.length ? res.errors.join(', ') : (res.message ?? 'Unknown error');
      throw new Error(detail);
    }
    return res.data as T;
  }

  private handleError(err: unknown): Observable<never> {
    return throwError(() => err);
  }
}

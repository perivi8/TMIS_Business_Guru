import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get the auth token from the service
    const authToken = this.authService.getToken();
    
    // Clone the request and add the authorization header if token exists
    if (authToken) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      console.log('Auth Interceptor - Adding token to request:', request.url);
      console.log('Auth Interceptor - Token:', authToken.substring(0, 20) + '...');
    } else {
      console.log('Auth Interceptor - No token available for request:', request.url);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('Auth Interceptor - HTTP Error:', error.status, error.message);
        
        if (error.status === 401) {
          // Unauthorized - redirect to login
          console.log('Auth Interceptor - 401 Unauthorized, redirecting to login');
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        
        return throwError(error);
      })
    );
  }
}

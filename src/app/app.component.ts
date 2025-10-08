import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'TMIS Business Guru';
  showNavbar = false;
  showPublicHeader = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  // Get current user
  getCurrentUser() {
    return this.authService.currentUserValue;
  }

  // Logout functionality
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit() {
    // Restore user session on app initialization for persistent login
    this.authService.restoreSession();
    
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Determine which header to show
        if (event.url === '/add-new-enquiry') {
          // Hide all headers for public enquiry page - show only the form
          this.showPublicHeader = false;
          this.showNavbar = false;
        } else if (['/login', '/register'].includes(event.url)) {
          // Hide both headers for login/register pages
          this.showPublicHeader = false;
          this.showNavbar = false;
        } else if (this.authService.isAuthenticated()) {
          // Show main navbar for authenticated users on other pages
          this.showPublicHeader = false;
          this.showNavbar = true;
        } else {
          // Hide both headers for unauthenticated users on protected pages
          this.showPublicHeader = false;
          this.showNavbar = false;
        }
        
        // Scroll to top on route navigation
        window.scrollTo(0, 0);
        
        // Handle automatic redirection for authenticated users
        if (this.authService.isAuthenticated() && ['/login', '/register'].includes(event.url)) {
          const user = this.authService.currentUserValue;
          if (user?.role === 'admin') {
            this.router.navigate(['/admin-dashboard']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }
      }
    });
  }
}

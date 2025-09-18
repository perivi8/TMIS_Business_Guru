import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Check if already authenticated and redirect immediately
    if (this.authService.isAuthenticated()) {
      this.redirectAuthenticatedUser();
      return;
    }

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  /**
   * Redirect authenticated user to appropriate dashboard
   */
  private redirectAuthenticatedUser(): void {
    const user = this.authService.currentUserValue;
    if (user?.role === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password)
      .subscribe({
        next: (user) => {
          // Redirect based on user role using helper method
          this.redirectAuthenticatedUser();
        },
        error: (error) => {
          this.error = error.error?.error || 'Login failed. Please check your credentials.';
          this.loading = false;
        }
      });
  }
}

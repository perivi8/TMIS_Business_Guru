import { Component, OnInit } from '@angular/core';
import { UserService, User } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss']
})
export class TeamComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error = '';
  currentUser: any;
  isAdmin = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    // Check if current user is admin
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'admin';
    });
    
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (response) => {
        this.users = response.users;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load team members';
        this.loading = false;
      }
    });
  }

  deleteUser(user: User): void {
    if (!this.isAdmin) {
      return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete ${user.username}? This action cannot be undone.`);
    
    if (confirmDelete) {
      this.authService.deleteUser(user._id).subscribe({
        next: (response) => {
          // Remove user from local array
          this.users = this.users.filter(u => u._id !== user._id);
          alert(`${user.username} has been deleted successfully.`);
        },
        error: (error) => {
          alert(`Failed to delete user: ${error.error?.error || 'Unknown error'}`);
        }
      });
    }
  }

  goBack(): void {
    window.history.back();
  }
}

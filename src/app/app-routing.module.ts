import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { TeamComponent } from './components/team/team.component';
import { ClientsComponent } from './components/clients/clients.component';
import { ClientDetailComponent } from './components/client-detail/client-detail.component';
import { NewClientComponent } from './components/new-client/new-client.component';
import { EditClientComponent } from './components/edit-client/edit-client.component';
import { ContactUsComponent } from './components/contact-us/contact-us.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { EnquiryComponent } from './components/enquiry/enquiry.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { WhatsappLinkComponent } from './components/whatsapp-link/whatsapp-link.component';
import { WhatsappPublicComponent } from './components/whatsapp-public/whatsapp-public.component';
import { WhatsappTestComponent } from './components/whatsapp-test/whatsapp-test.component';
import { PublicEnquiryComponent } from './components/public-enquiry/public-enquiry.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'admin-dashboard', 
    component: AdminDashboardComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  { 
    path: 'team', 
    component: TeamComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'clients', 
    component: ClientsComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'clients/:id', 
    component: ClientDetailComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'enquiry', 
    component: EnquiryComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'new-client', 
    component: NewClientComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'clients/:id/edit', 
    component: EditClientComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'contact-us', 
    component: ContactUsComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'notifications', 
    component: NotificationsComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'whatsapp-link', 
    component: WhatsappLinkComponent 
  },
  { 
    path: 'whatsapp-public', 
    component: WhatsappPublicComponent 
  },
  { 
    path: 'whatsapp-test', 
    component: WhatsappTestComponent 
  },
  { 
    path: 'new-enquiry', 
    component: PublicEnquiryComponent 
  },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
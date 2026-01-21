import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginType = signal<'CLIENT' | 'ADMIN'>('CLIENT');
  numeroCompte = signal('');
  password = signal('');
  errorMessage = signal('');
  isLoading = signal(false);
  showPassword = signal(false);
  showAdminPassword = signal(false);



  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    
    if (typeof window !== 'undefined' && window.localStorage) {
      // Vérifier si c'est une navigation directe vers /login (pas une redirection après login)
      const urlParams = new URLSearchParams(window.location.search);
      const forceLogin = urlParams.get('force') === 'true';
      
      if (forceLogin) {
        // Forcer la déconnexion pour une connexion propre
        localStorage.removeItem('egabank_user');
        localStorage.removeItem('token');
      } else if (this.authService.isLoggedIn) {
        // Si déjà connecté et pas de force, rediriger
        this.redirectAfterLogin();
      }
    }
  }

  setLoginType(type: 'CLIENT' | 'ADMIN'): void {
    this.loginType.set(type);
    this.errorMessage.set('');
  }

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleAdminPassword(): void {
    this.showAdminPassword.set(!this.showAdminPassword());
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set('');
    this.isLoading.set(true);

    let credentials: LoginCredentials;
    if (this.loginType() === 'ADMIN') {
      credentials = {
        type: 'ADMIN',
        password: this.password()
      };
    } else {
      credentials = {
        type: 'CLIENT',
        numeroCompte: this.numeroCompte(),
        password: this.password()
      };
    }

    try {
      const result = await this.authService.login(credentials);
      if (result.success) {
        this.redirectAfterLogin();
      } else {
        this.errorMessage.set(result.message);
      }
    } catch (error) {
      this.errorMessage.set('Erreur de connexion');
    } finally {
      this.isLoading.set(false);
    }
  }

  private redirectAfterLogin(): void {
    if (this.authService.isAdmin) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/client']);
    }
  }
}

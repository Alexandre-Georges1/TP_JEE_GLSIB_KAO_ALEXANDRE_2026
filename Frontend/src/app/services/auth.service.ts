import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { User, LoginCredentials } from '../models/auth.model';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    if (typeof window !== 'undefined' && window.localStorage) {
      const user = localStorage.getItem('egabank_user');
      if (user) {
        this.currentUserSubject.next(JSON.parse(user));
      }
    }
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  get isAdmin(): boolean {
    return this.currentUserSubject.value?.type === 'ADMIN';
  }

  get isClient(): boolean {
    return this.currentUserSubject.value?.type === 'CLIENT';
  }

  get getNumericClientId(): number | undefined {
    const cid = this.currentUserSubject.value?.clientId;
    return cid ? Number(cid) : undefined;
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string }> {
    let body: any;
    // Pour l'admin : juste le mot de passe
    if (credentials.type === 'ADMIN') {
      body = { password: credentials.password };
    } else {
      // Pour le client : username (numéro de compte) + mot de passe
      body = { username: credentials.numeroCompte, password: credentials.password };
    }
    try {
      const response: any = await this.http.post('http://localhost:8081/auth/login', body).toPromise();
      if (response && response.token) {
        localStorage.setItem('token', response.token);
        // Décoder le token pour récupérer les infos utilisateur
        const user: User = this.decodeUserFromToken(response.token);
        this.setUser(user);
        return { success: true, message: 'Connexion réussie' };
      } else {
        return { success: false, message: 'Identifiants invalides' };
      }
    } catch (e) {
      return { success: false, message: 'Erreur lors de la connexion' };
    }
  }

  private decodeUserFromToken(token: string): User {
    const decoded: any = jwtDecode(token);
    return {
      id: decoded.sub,
      type: decoded.role,
      numeroCompte: decoded.numeroCompte || (decoded.role === 'CLIENT' ? decoded.sub : undefined),
      clientId: decoded.clientId,
      nom: decoded.nom,
      prenom: decoded.prenom
    };
  }

  // Suppression des anciennes méthodes loginAdmin et loginClient

  private setUser(user: User): void {
    this.currentUserSubject.next(user);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('egabank_user', JSON.stringify(user));
    }
  }

  logout(): void {
    this.currentUserSubject.next(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('egabank_user');
      localStorage.removeItem('token');
    }
    this.router.navigate(['/login'], { queryParams: { force: 'true' } });
  }
}

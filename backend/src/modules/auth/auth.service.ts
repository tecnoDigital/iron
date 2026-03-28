export class AuthService {
  isAllowedEmail(email: string, allowedEmails: string[]): boolean {
    return allowedEmails.map((item) => item.toLowerCase()).includes(email.toLowerCase());
  }
}

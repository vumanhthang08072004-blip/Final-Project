import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Body: { username: string, password: string }
   * Returns: { access_token: string }
   */
  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    this.logger.log(`Login attempt for user: "${body.username}"`);
    return this.authService.login(body.username, body.password);
  }

  /**
   * POST /api/auth/seed
   * Creates the default admin account (for initial setup)
   * Should be called once during deployment
   */
  @Post('seed')
  async seedAdmin() {
    return this.authService.seedAdmin();
  }
}

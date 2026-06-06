import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials against database
   */
  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng.');
    }

    return user;
  }

  /**
   * Generate JWT token for authenticated user
   */
  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    this.logger.log(`User "${username}" logged in successfully.`);

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Seed default admin account (run once)
   */
  async seedAdmin() {
    const existingAdmin = await this.prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (existingAdmin) {
      this.logger.log('Admin account already exists. Skipping seed.');
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await this.prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        fullName: 'Administrator',
        role: 'admin',
      },
    });

    this.logger.log('Default admin account created successfully.');
    return admin;
  }
}

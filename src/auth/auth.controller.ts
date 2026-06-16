import { Body, Controller, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { access_token, user } = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-password')
  async verifyPassword(
    @Req() req: express.Request & { user?: { email: string } },
    @Body() dto: VerifyPasswordDto,
  ) {
    if (!req.user?.email) throw new UnauthorizedException('No autenticado.');
    await this.authService.verifyPassword(req.user.email, dto.password);
    return { ok: true };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: express.Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    return { message: 'Sesión cerrada.' };
  }
}

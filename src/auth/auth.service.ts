import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';


@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: this.usersService.toSafeUser(user),
    };
  }

  async verifyPassword(email: string, password: string): Promise<void> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Contraseña incorrecta.');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Contraseña incorrecta.');
    }
  }
}

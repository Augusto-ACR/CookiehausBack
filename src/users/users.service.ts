import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const userExists = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
      withDeleted: false,
    });

    if (userExists) {
      throw new ConflictException('Ya existe un usuario con ese email.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      email: createUserDto.email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);
    return this.toSafeUser(savedUser);
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => this.toSafeUser(user));
  }

  async findOne(id: number): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return this.toSafeUser(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const existingUser = await this.usersRepository.findOne({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (updateUserDto.email) {
      const userWithEmail = await this.usersRepository.findOne({
        where: { email: updateUserDto.email.toLowerCase().trim() },
      });

      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictException('Ya existe un usuario con ese email.');
      }
    }

    let hashedPassword: string | undefined;
    if (updateUserDto.password) {
      hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
    }

    const payload: Partial<User> = {
      ...updateUserDto,
      email: updateUserDto.email?.toLowerCase().trim(),
    };

    if (hashedPassword) {
      payload.password = hashedPassword;
    }

    await this.usersRepository.update(id, payload);
    const updatedUser = await this.usersRepository.findOne({ where: { id } });

    if (!updatedUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.toSafeUser(updatedUser);
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    await this.usersRepository.softDelete(id);
    return { message: 'Usuario eliminado correctamente.' };
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  toSafeUser(user: User): SafeUser {
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
}

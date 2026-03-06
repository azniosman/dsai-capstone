import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from '@app/entities/user.entity';
import { Tenant } from '@app/entities/tenant.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: EntityRepository<Tenant>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ email });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ id }, { populate: ['tenant'] });
  }

  async createUser(payload: {
    email: string;
    hashedPassword: string;
    name: string;
    tenantName: string;
  }): Promise<User> {
    const existing = await this.findByEmail(payload.email);
    if (existing) {
      throw new BadRequestException('User with that email already exists');
    }

    let tenant = await this.tenantRepository.findOne({
      name: payload.tenantName,
    });
    if (!tenant) {
      tenant = this.tenantRepository.create({ name: payload.tenantName });
      await this.tenantRepository.getEntityManager().persistAndFlush(tenant);
    }

    const user = this.userRepository.create({
      email: payload.email,
      hashedPassword: payload.hashedPassword,
      name: payload.name,
      tenant,
    });

    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }

  async updateUser(
    id: number,
    payload: { name?: string; email?: string },
  ): Promise<User> {
    const user = await this.userRepository.findOne(
      { id },
      { populate: ['tenant'] },
    );
    if (!user) throw new NotFoundException('User not found');

    if (payload.name !== undefined) user.name = payload.name;
    if (payload.email !== undefined) {
      const existing = await this.findByEmail(payload.email);
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already in use');
      }
      user.email = payload.email;
    }

    await this.userRepository.getEntityManager().flush();
    return user;
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ id });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    user.hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.getEntityManager().flush();
  }

  async deactivateUser(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ id });
    if (!user) throw new NotFoundException('User not found');

    user.isActive = false;
    user.name = 'Deleted User';
    user.email = `deleted_${randomUUID()}@deleted.invalid`;
    await this.userRepository.getEntityManager().flush();
  }
}

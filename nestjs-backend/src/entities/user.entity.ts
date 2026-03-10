import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  OptionalProps,
} from '@mikro-orm/core';
import type { Rel } from '@mikro-orm/core';
import { Role } from '@app/common/enums/role.enum';
import { Tenant } from './tenant.entity';

@Entity({ tableName: 'users' })
export class User {
  [OptionalProps]?: 'createdAt' | 'isActive' | 'failedLoginAttempts' | 'role';

  @PrimaryKey()
  id!: number;

  @Property({ unique: true, index: true })
  email!: string;

  @Property({ type: 'text' })
  hashedPassword!: string;

  @Property()
  name!: string;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ default: 0 })
  failedLoginAttempts: number = 0;

  @Property({ type: 'datetime', nullable: true })
  lockedUntil?: Date;

  @ManyToOne(() => Tenant, { index: true })
  tenant!: Rel<Tenant>;

  @Enum({ items: () => Role, default: Role.MEMBER })
  role: Role = Role.MEMBER;
}

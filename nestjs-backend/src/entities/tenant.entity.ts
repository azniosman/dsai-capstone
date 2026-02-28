import {
  Entity,
  PrimaryKey,
  Property,
  Collection,
  OneToMany,
} from '@mikro-orm/core';
import { User } from './user.entity';

@Entity({ tableName: 'tenants' })
export class Tenant {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true, index: true })
  name!: string;

  @OneToMany(() => User, (user) => user.tenant)
  users = new Collection<User>(this);
}

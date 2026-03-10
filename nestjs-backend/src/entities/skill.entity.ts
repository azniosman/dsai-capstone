import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import type { Rel } from '@mikro-orm/core';
import { Tenant } from './tenant.entity';

@Entity({ tableName: 'skills' })
export class Skill {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true, index: true })
  name!: string;

  @Property()
  category!: string;

  @ManyToOne(() => Tenant, { nullable: true, index: true })
  tenant?: Rel<Tenant>;
}

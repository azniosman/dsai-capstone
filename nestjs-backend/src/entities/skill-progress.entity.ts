import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Rel,
  OptionalProps,
} from '@mikro-orm/core';
import { UserProfile } from './user-profile.entity';
import { Tenant } from './tenant.entity';

@Entity({ tableName: 'skill_progress' })
export class SkillProgress {
  [OptionalProps]?: 'level' | 'recordedAt';

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => UserProfile, { index: true })
  profile!: Rel<UserProfile>;

  @Property()
  skill!: string;

  @Property({ type: 'float', default: 0.0 })
  level: number = 0.0;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  recordedAt: Date = new Date();

  @ManyToOne(() => Tenant, { index: true })
  tenant!: Rel<Tenant>;
}

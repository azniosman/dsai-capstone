import { Entity, PrimaryKey, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { UserProfile } from './user-profile.entity';

@Entity({ tableName: 'profile_snapshots' })
export class ProfileSnapshot {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => UserProfile, { index: true })
  profile!: Rel<UserProfile>;

  @Property({ type: 'date', defaultRaw: 'CURRENT_DATE', index: true })
  snapshotDate: Date = new Date();

  @Property({ default: 0 })
  skillsCount: number = 0;

  @Property({ default: 0 })
  recommendationsCount: number = 0;

  @Property({ default: 0 })
  gapsCount: number = 0;

  @Property({ type: 'float', default: 0.0 })
  careerReadiness: number = 0.0;
}

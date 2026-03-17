import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  OptionalProps,
} from '@mikro-orm/core';
import type { Rel } from '@mikro-orm/core';
import type { CareerIntelligence } from '../intelligence/dto/copilot.dto';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { ProfileSnapshot } from './profile-snapshot.entity';

@Entity({ tableName: 'user_profiles' })
export class UserProfile {
  [OptionalProps]?:
    | 'createdAt'
    | 'yearsExperience'
    | 'skills'
    | 'isCareerSwitcher'
    | 'email'
    | 'phone'
    | 'location'
    | 'careerIntelligence';

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User, { nullable: true, index: true })
  user?: Rel<User>;

  @ManyToOne(() => Tenant, { nullable: true, index: true })
  tenant?: Rel<Tenant>;

  @Property()
  name!: string;

  @Property({ nullable: true })
  email?: string;

  @Property({ nullable: true })
  phone?: string;

  @Property({ nullable: true })
  location?: string;

  @Property({ nullable: true })
  education?: string;

  @Property({ default: 0 })
  yearsExperience: number = 0;

  @Property({ nullable: true })
  age?: number;

  @Property({ type: 'json' })
  skills: string[] = [];

  @Property({ type: 'text', nullable: true })
  resumeText?: string;

  @Property({ default: false })
  isCareerSwitcher: boolean = false;

  /**
   * AI-extracted career intelligence profile.
   * Populated by `CopilotService.extractCareerProfile()` after resume analysis.
   * Persisted as JSONB for efficient querying.
   */
  @Property({ type: 'json', nullable: true })
  careerIntelligence?: CareerIntelligence;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  @OneToMany(() => ProfileSnapshot, (snapshot) => snapshot.profile)
  snapshots = new Collection<ProfileSnapshot>(this);
}

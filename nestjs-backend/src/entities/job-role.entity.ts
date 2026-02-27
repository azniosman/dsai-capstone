import { Entity, PrimaryKey, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { Tenant } from './tenant.entity';

@Entity({ tableName: 'job_roles' })
export class JobRole {
  @PrimaryKey()
  id!: number;

  @Property({ index: true })
  title!: string;

  @Property()
  category!: string;

  @Property({ type: 'text' })
  description!: string;

  @Property({ type: 'json' })
  requiredSkills: string[] = [];

  @Property({ type: 'json' })
  preferredSkills: string[] = [];

  @Property({ default: 0 })
  minExperienceYears: number = 0;

  @Property({ default: 'bachelor' })
  educationLevel: string = 'bachelor';

  @Property({ default: false })
  careerSwitcherFriendly: boolean = false;

  @Property({ nullable: true })
  salaryRange?: string;

  @ManyToOne(() => Tenant, { index: true })
  tenant!: Rel<Tenant>;
}

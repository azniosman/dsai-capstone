import { Entity, PrimaryKey, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { Tenant } from './tenant.entity';

@Entity({ tableName: 'sctp_courses' })
export class SCTPCourse {
  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @Property()
  provider!: string;

  @Property({ type: 'json' })
  skillsTaught: string[] = [];

  @Property({ nullable: true })
  durationWeeks?: number;

  @Property({ default: 'intermediate' })
  level: string = 'intermediate';

  @Property({ nullable: true })
  url?: string;

  @Property({ nullable: true })
  certification?: string;

  @Property({ default: true })
  skillsfutureEligible: boolean = true;

  @Property({ type: 'float', default: 0.0 })
  skillsfutureCreditAmount: number = 0.0;

  @Property({ type: 'float', default: 0.0 })
  courseFee: number = 0.0;

  @Property({ type: 'float', default: 0.0 })
  nettFeeAfterSubsidy: number = 0.0;

  @Property({ type: 'float', default: 70.0 })
  subsidyPercent: number = 70.0;

  @Property({ default: false })
  mcesEligible: boolean = false;

  @ManyToOne(() => Tenant, { nullable: true, index: true })
  tenant?: Rel<Tenant>;
}

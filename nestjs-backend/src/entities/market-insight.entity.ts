import { Entity, PrimaryKey, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { Tenant } from './tenant.entity';

@Entity({ tableName: 'market_insights' })
export class MarketInsight {
  @PrimaryKey()
  id!: number;

  @Property({ index: true })
  roleCategory!: string;

  @Property({ type: 'json' })
  trendingSkills: string[] = [];

  @Property({ type: 'float', nullable: true })
  avgSalarySgd?: number;

  @Property({ nullable: true })
  demandLevel?: string;

  @Property({ nullable: true })
  hiringVolume?: number;

  @Property({ type: 'float', nullable: true })
  yoyGrowthPct?: number;

  @Property({ nullable: true })
  forecast2026?: string;

  @Property({ nullable: true })
  outlook?: string;

  @Property({
    type: 'datetime',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date = new Date();

  @ManyToOne(() => Tenant, { nullable: true, index: true })
  tenant?: Rel<Tenant>;
}

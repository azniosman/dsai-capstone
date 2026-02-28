import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * Caches raw SSG/WSG API responses in PostgreSQL.
 * Key pattern: `<endpoint>:<params_hash>`
 * TTL is checked at read time (not enforced by DB).
 */
@Entity({ tableName: 'ssg_cache' })
export class SsgCache {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true, length: 512 })
  cacheKey!: string;

  @Property({ type: 'json' })
  value!: Record<string, unknown>;

  @Property()
  createdAt: Date = new Date();

  @Property({ nullable: true })
  expiresAt?: Date;
}

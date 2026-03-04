/**
 * @file vector.type.ts
 * @description Custom MikroORM property type for pgvector `vector(N)` columns.
 *
 * Handles serialisation between JS `number[]` and the pgvector wire format
 * (`[0.1,0.2,...]`) transparently for all ORM read/write paths.
 */

import type { EntityProperty, Platform } from '@mikro-orm/core';
import { Type } from '@mikro-orm/core';

export class VectorType extends Type<number[], string> {
  /**
   * Converts a JS float array to the pgvector literal accepted by
   * `::vector` casts and INSERT/UPDATE statements.
   * e.g. [0.1, 0.2, 0.3] → '[0.1,0.2,0.3]'
   */
  convertToDatabaseValue(value: number[] | string | null): string {
    if (value === null || value === undefined) return '[]';
    if (typeof value === 'string') return value;
    return `[${value.join(',')}]`;
  }

  /**
   * Parses the pgvector string returned by SELECT into a JS float array.
   * pgvector returns the column as e.g. '[0.1,0.2,0.3]'
   */
  convertToJSValue(value: string | number[] | null): number[] {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    const str = (value as string).trim();
    if (!str || str === '[]') return [];
    // Strip leading/trailing brackets then split
    const inner = str.startsWith('[') ? str.slice(1, -1) : str;
    return inner.split(',').map(Number);
  }

  /** The actual PostgreSQL column type. `prop.length` carries the dimension. */
  getColumnType(prop: EntityProperty, _platform: Platform): string {
    return `vector(${prop.length ?? 384})`;
  }

  toJSON(value: number[]): number[] {
    return value;
  }
}

import { Migration } from '@mikro-orm/migrations';

export class Migration20260306000144 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "system_log" ("id" uuid not null, "timestamp" timestamptz not null, "type" varchar(20) not null, "component" varchar(100) not null, "message" text not null, "trace_id" varchar(50) null, "meta" jsonb null, constraint "system_log_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create index "system_log_timestamp_index" on "system_log" ("timestamp");`,
    );
    this.addSql(
      `create index "system_log_type_index" on "system_log" ("type");`,
    );
    this.addSql(
      `create index "system_log_component_index" on "system_log" ("component");`,
    );
    this.addSql(
      `create index "system_log_trace_id_index" on "system_log" ("trace_id");`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "system_log" cascade;`);
  }
}

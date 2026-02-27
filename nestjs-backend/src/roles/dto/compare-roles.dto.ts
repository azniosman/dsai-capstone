import { IsArray, IsInt, Min, ArrayMinSize } from 'class-validator';

export class CompareRolesDto {
  @IsInt()
  @Min(1)
  profile_id!: number;

  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(2)
  role_ids!: number[];
}

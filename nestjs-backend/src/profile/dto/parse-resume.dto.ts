import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for parsing a raw text resume.
 */
export class ParseResumeDto {
  /** The raw unstructured text content extracted from a candidate's resume */
  @IsString()
  @IsNotEmpty()
  resume_text!: string;
}

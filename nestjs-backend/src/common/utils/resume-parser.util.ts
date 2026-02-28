import pdf from 'pdf-parse';
import * as mammoth from 'mammoth';

/**
 * Utility class for extracting text from resume files.
 */
export class ResumeParser {
  /**
   * Extract raw text from a PDF or DOCX buffer.
   */
  static async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    if (mimeType === 'text/plain') {
      return buffer.toString('utf8');
    }

    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  /**
   * Simple regex-based skill extraction for first-pass parsing.
   * In a real app, this would be replaced by an LLM call.
   */
  static extractSkills(text: string): string[] {
    const commonSkills = [
      'Python',
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'NestJS',
      'SQL',
      'PostgreSQL',
      'Docker',
      'AWS',
      'Azure',
      'Machine Learning',
      'Data Analysis',
      'Project Management',
      'Agile',
      'Java',
      'Go',
      'Rust',
    ];

    const results = new Set<string>();
    const lowerText = text.toLowerCase();

    commonSkills.forEach((skill) => {
      if (lowerText.includes(skill.toLowerCase())) {
        results.add(skill);
      }
    });

    return Array.from(results);
  }
}

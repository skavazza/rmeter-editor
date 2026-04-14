// src/lib/IniParser.ts

export interface IniSection {
  name: string;
  params: Record<string, string>;
  comments: string[];
}

export class IniParser {
  /**
   * Parses an INI string into an array of sections.
   * Preserves section order and comments within sections.
   */
  public static parse(content: string): IniSection[] {
    const sections: IniSection[] = [];
    const lines = content.split(/\r?\n/);
    let currentSection: IniSection | null = null;
    let pendingComments: string[] = [];

    for (let line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines but keep comments
      if (!trimmedLine) {
        continue;
      }

      // Comment
      if (trimmedLine.startsWith(';') || trimmedLine.startsWith('#')) {
        pendingComments.push(line);
        continue;
      }

      // Section Header
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        const sectionName = trimmedLine.substring(1, trimmedLine.length - 1);
        currentSection = {
          name: sectionName,
          params: {},
          comments: [...pendingComments]
        };
        sections.push(currentSection);
        pendingComments = [];
        continue;
      }

      // Key=Value
      const eqIndex = line.indexOf('=');
      if (eqIndex !== -1) {
        const key = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();
        
        if (currentSection) {
          currentSection.params[key] = value;
        } else {
          // Key outside any section (DEFAULT)
          if (!sections.find(s => s.name === 'DEFAULT')) {
            sections.unshift({ name: 'DEFAULT', params: {}, comments: [] });
          }
          sections[0].params[key] = value;
        }
        continue;
      }
    }

    return sections;
  }

  /**
   * Stringifies sections back to INI format.
   */
  public static stringify(sections: IniSection[]): string {
    let output = '';

    for (const section of sections) {
      // Add comments
      for (const comment of section.comments) {
        output += comment + '\n';
      }

      // Add header
      if (section.name !== 'DEFAULT') {
        output += `[${section.name}]\n`;
      }

      // Add params
      for (const [key, value] of Object.entries(section.params)) {
        output += `${key}=${value}\n`;
      }

      output += '\n';
    }

    return output.trim();
  }
}

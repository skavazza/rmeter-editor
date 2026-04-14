// src/lib/RainmeterUtils.ts
import { IniSection, IniParser } from './IniParser';

export interface SkinMetadata {
  name: string;
  author: string;
  version: string;
  description: string;
  allowScrollResize: boolean;
  rawMetadata?: Record<string, string>;
  rawRainmeter?: Record<string, string>;
  rawVariables?: Record<string, string>;
}

export class RainmeterUtils {
  /**
   * Parses metadata and properties from INI sections.
   */
  public static parseMetadata(sections: IniSection[]): SkinMetadata {
    const metadata: SkinMetadata = {
      name: 'MySkin',
      author: 'MyName',
      version: '1.0',
      description: 'My skin description',
      allowScrollResize: false,
      rawMetadata: {},
      rawRainmeter: {},
      rawVariables: {},
    };

    for (const section of sections) {
      const lowerName = section.name.toLowerCase();
      if (lowerName === 'metadata') {
        metadata.rawMetadata = { ...section.params };
        if (section.params.Name) metadata.name = section.params.Name;
        if (section.params.Author) metadata.author = section.params.Author;
        if (section.params.Version) metadata.version = section.params.Version;
        if (section.params.Information) metadata.description = section.params.Information;
      } else if (lowerName === 'rainmeter') {
        metadata.rawRainmeter = { ...section.params };
        // Check for mouse scroll resize pattern
        const scrollUp = section.params.MouseScrollUpAction;
        if (scrollUp && scrollUp.includes('!SetVariable Scale')) {
          metadata.allowScrollResize = true;
        }
      } else if (lowerName === 'variables') {
        metadata.rawVariables = { ...section.params };
      }
    }

    return metadata;
  }

  public static parseMetadataFromIni(iniContent: string): SkinMetadata {
    const sections = IniParser.parse(iniContent);
    return this.parseMetadata(sections);
  }

  /**
   * Resolves #Variable# references in properties.
   */
  public static resolveVariables(
    props: Record<string, string>,
    variables: Record<string, string>,
    resourcesDir: string = ''
  ): Record<string, string> {
    const resolvedProps: Record<string, string> = {};

    const subVal = (val: string, depth: number = 0): string => {
      if (depth > 5 || typeof val !== 'string') {
        return val;
      }

      // Replace #@# with @Resources directory
      if (resourcesDir) {
        val = val.replace(/#@#/g, resourcesDir + '/@Resources/');
      }

      // Replace #Var# with variable value (case-insensitive)
      const newVal = val.replace(/#([^#]+)#/g, (match, varName) => {
        const lowerName = varName.toLowerCase();
        return variables[lowerName] !== undefined ? variables[lowerName] : match;
      });

      if (newVal !== val && newVal.includes('#')) {
        return subVal(newVal, depth + 1);
      }
      return newVal;
    };

    for (const [key, value] of Object.entries(props)) {
      resolvedProps[key] = subVal(value);
    }

    return resolvedProps;
  }

  /**
   * Extracts variables from [Variables] sections.
   */
  public static parseVariables(sections: IniSection[]): Record<string, string> {
    const variables: Record<string, string> = {};
    for (const section of sections) {
      if (section.name.toLowerCase() === 'variables') {
        for (const [key, value] of Object.entries(section.params)) {
          variables[key.toLowerCase()] = value;
        }
      }
    }
    return variables;
  }

  /**
   * Resolves variable references within the variables themselves.
   */
  public static resolveVariableReferences(variables: Record<string, string>): Record<string, string> {
    const resolved = { ...variables };
    for (let i = 0; i < 5; i++) {
      let changed = false;
      for (const [key, value] of Object.entries(resolved)) {
        if (value.includes('#')) {
          const newVal = value.replace(/#([^#]+)#/g, (match, varName) => {
            const lowerName = varName.toLowerCase();
            if (resolved[lowerName] !== undefined) {
              changed = true;
              return resolved[lowerName];
            }
            return match;
          });
          resolved[key] = newVal;
        }
      }
      if (!changed) break;
    }
    return resolved;
  }
}

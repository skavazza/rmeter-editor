import React, { useEffect, useRef } from 'react';
import Editor, { loader, Monaco } from '@monaco-editor/react';
import { useTheme } from './theme-provider';

// Configure monaco loading if needed (defaults to CDN)
// loader.config({ paths: { vs: '...' } });

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: 'rainmeter' | 'ini' | 'text';
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

const RAINMETER_KEYWORDS = [
  // Sections
  "[Rainmeter]", "[Variables]", "[Metadata]", "[MeterStyles]",
  
  // Meter types
  "Meter=String", "Meter=Image", "Meter=Bar", "Meter=Line", "Meter=Histogram", 
  "Meter=Roundline", "Meter=Shape", "Meter=Button", "Meter=Rotator", "Meter=Bitmap", "Meter=WebParser",
  
  // Measure types
  "Measure=Calc", "Measure=CPU", "Measure=Memory", "Measure=Net", "Measure=NetIn", 
  "Measure=NetOut", "Measure=Time", "Measure=Uptime", "Measure=FreeDiskSpace", 
  "Measure=Plugin", "Measure=String", "Measure=Process", "Measure=Registry", "Measure=WebParser",
  
  // Common options
  "X=", "Y=", "W=", "H=", "MeterStyle=", "MeasureName=", "SolidColor=", "FontColor=", 
  "FontFace=", "FontSize=", "Text=", "AntiAlias=1", "DynamicVariables=1", "UpdateDivider=",
  "Hidden=1", "Group=", "OnUpdateAction=", "LeftMouseUpAction=", "RightMouseUpAction=",
  
  // Bangs
  "!Refresh", "!Update", "!Redraw", "!ActivateConfig", "!DeactivateConfig", "!ToggleConfig",
  "!Show", "!Hide", "!Toggle", "!SetVariable", "!SetOption", "!CommandMeasure", "!Log", "!Quit"
];

const registerRainmeterLanguage = (monaco: Monaco) => {
  // Register a new language
  monaco.languages.register({ id: 'rainmeter' });

  // Register a tokens provider for the language
  monaco.languages.setMonarchTokensProvider('rainmeter', {
    defaultToken: '',
    tokenPostfix: '.ini',

    keywords: [
      'Meter', 'Measure', 'Plugin', 'MeasureName', 'MeterStyle'
    ],

    tokenizer: {
      root: [
        // Sections
        [/^\[.*\]/, 'type.identifier'],

        // Comments
        [/^;.*$/, 'comment'],
        [/#.*$/, 'comment'],

        // Variables
        [/#[^#]+#/, 'variable'],

        // Bangs
        [/![\w]+/, 'keyword'],

        // Keys
        [/^[a-zA-Z0-9_-]+(?==)/, 'attribute.name'],

        // Values
        [/=/, 'operator', '@value'],

        // whitespace
        { include: '@whitespace' },
      ],

      value: [
        [/#[^#]+#/, 'variable'],
        [/![\w]+/, 'keyword'],
        [/[,]/, 'delimiter'],
        [/.*$/, 'string', '@pop'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
      ],
    },
  });

  // Autocomplete provider
  monaco.languages.registerCompletionItemProvider('rainmeter', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = RAINMETER_KEYWORDS.map(k => ({
        label: k,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: k,
        range: range,
      }));

      return { suggestions: suggestions };
    },
  });

  // Define a theme
  monaco.editor.defineTheme('rainmeter-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'type.identifier', foreground: '60a5fa', fontStyle: 'bold' }, // Blue
      { token: 'comment', foreground: '16a34a' }, // Green
      { token: 'variable', foreground: 'c084fc' }, // Purple
      { token: 'keyword', foreground: 'f472b6' }, // Pink (Bangs)
      { token: 'attribute.name', foreground: 'f87171' }, // Red (Keys)
      { token: 'operator', foreground: '94a3b8' },
      { token: 'string', foreground: 'fde047' }, // Yellow (Values)
    ],
    colors: {
      'editor.background': '#18181b',
      'editor.lineHighlightBackground': '#27272a',
    }
  });
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'rainmeter',
  readOnly = false,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Map 'ini' to our custom 'rainmeter' language
  const editorLanguage = language === 'ini' ? 'rainmeter' : language;

  const handleEditorWillMount = (monaco: Monaco) => {
    // Only register once
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'rainmeter')) {
      registerRainmeterLanguage(monaco);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (onChange) {
      onChange(value || '');
    }
  };

  return (
    <div className={`w-full h-full border rounded-lg overflow-hidden glass ${className}`}>
      <Editor
        height="100%"
        width="100%"
        language={editorLanguage}
        value={value}
        theme={isDark ? 'rainmeter-dark' : 'light'}
        onChange={handleEditorChange}
        beforeMount={handleEditorWillMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          renderLineHighlight: 'all',
          contextmenu: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;

// ═══════════════════════════════════════════════════════════════
// CODE EDITOR
// In-browser code editor for isolated VM file edits
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Code2, FileCode, Save, RotateCcw, Copy, Check } from 'lucide-react';

interface FileTab {
  name: string;
  language: string;
  content: string;
}

const DEFAULT_FILES: FileTab[] = [
  {
    name: 'db/pool.js',
    language: 'javascript',
    content: `const { Pool } = require('pg');

// BUG: No connection timeout or pool size limits
const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // FIX: Add these parameters
  // max: 20,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error', err);
  // BUG: Process exits instead of recovering
  process.exit(-1);
});

module.exports = { pool };`,
  },
  {
    name: 'server.js',
    language: 'javascript',
    content: `const express = require('express');
const { pool } = require('./db/pool');
const app = express();

// BUG: No request timeout middleware
app.use(express.json());

app.get('/api/v2/products', async (req, res) => {
  try {
    // BUG: No query timeout, can hang indefinitely
    const result = await pool.query(
      'SELECT * FROM products WHERE active = true'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Query failed:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
  },
  {
    name: 'nginx.conf',
    language: 'nginx',
    content: `server {
    listen 80;
    server_name acme-corp.com;

    # BUG: No timeout configured
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        
        # FIX: Add these timeouts
        # proxy_connect_timeout 5s;
        # proxy_send_timeout 10s;
        # proxy_read_timeout 10s;
    }

    location / {
        root /var/www/html;
        try_files $uri $uri/ =404;
    }
}`,
  },
];

interface CodeEditorProps {
  incidentId: string;
}

export function CodeEditor({ incidentId }: CodeEditorProps) {
  const [files, setFiles] = useState<FileTab[]>(DEFAULT_FILES);
  const [activeFile, setActiveFile] = useState(0);
  const [editedContent, setEditedContent] = useState(DEFAULT_FILES[0].content);
  const [hasChanges, setHasChanges] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentFile = files[activeFile];

  const handleFileChange = (index: number) => {
    if (hasChanges) {
      // Save current changes
      setFiles(prev => prev.map((f, i) =>
        i === activeFile ? { ...f, content: editedContent } : f
      ));
    }
    setActiveFile(index);
    setEditedContent(files[index].content);
    setHasChanges(false);
  };

  const handleSave = () => {
    setFiles(prev => prev.map((f, i) =>
      i === activeFile ? { ...f, content: editedContent } : f
    ));
    setHasChanges(false);
  };

  const handleReset = () => {
    setEditedContent(currentFile.content);
    setHasChanges(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting
  const highlightCode = (code: string) => {
    const lines = code.split('\n');
    return lines.map((line, i) => {
      // Comments
      let processed = line
        .replace(/(\/\/.*$)/, '<span class="text-white/30">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/, '<span class="text-white/30">$1</span>')
        .replace(/(#.*$)/, '<span class="text-white/30">$1</span>');

      // Keywords
      processed = processed
        .replace(/\b(const|let|var|function|return|if|else|try|catch|async|await|import|from|export|default|class|new|this)\b/g,
          '<span class="text-magenta">$1</span>');

      // Strings
      processed = processed
        .replace(/('.*?')/g, '<span class="text-lime">$1</span>')
        .replace(/(".*?")/g, '<span class="text-lime">$1</span>');

      // Numbers
      processed = processed
        .replace(/(\d+)/g, '<span class="text-cyan">$1</span>');

      // Functions
      processed = processed
        .replace(/(\w+)(\()/g, '<span class="text-yellow-400">$1</span>$2');

      return (
        <div key={i} className="flex">
          <span className="text-white/15 select-none w-8 text-right pr-3 flex-shrink-0">
            {i + 1}
          </span>
          <span
            className="text-white/70"
            dangerouslySetInnerHTML={{ __html: processed || '&nbsp;' }}
          />
        </div>
      );
    });
  };

  return (
    <div className="bg-surface border border-white/10 flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-lime" />
          <span className="text-xs font-bold">Code Editor</span>
          <span className="text-[10px] text-white/30 font-mono">{incidentId}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-[10px] text-yellow-400 font-mono animate-pulse">UNSAVED</span>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-3 h-3 text-lime" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-white/30 hover:text-yellow-400 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-lime/10 border border-lime/30 text-lime text-xs font-bold hover:bg-lime/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3" />
            SAVE
          </button>
        </div>
      </div>

      {/* File Tabs */}
      <div className="flex border-b border-white/5 bg-black/20">
        {files.map((file, i) => (
          <button
            key={file.name}
            onClick={() => handleFileChange(i)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-r border-white/5 transition-colors ${
              i === activeFile
                ? 'bg-white/5 text-white border-t-2 border-t-lime'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            <FileCode className="w-3 h-3" />
            {file.name}
          </button>
        ))}
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto min-h-[300px]">
        <div className="p-2 font-mono text-xs">
          {/* Editable overlay on top of highlighted code */}
          <textarea
            value={editedContent}
            onChange={(e) => {
              setEditedContent(e.target.value);
              setHasChanges(true);
            }}
            className="w-full h-full min-h-[300px] bg-transparent text-transparent caret-white font-mono text-xs leading-relaxed resize-none outline-none absolute inset-0 p-2"
            spellCheck={false}
            style={{ zIndex: 2 }}
          />
          {/* Syntax highlighted display underneath */}
          <div className="pointer-events-none select-none" style={{ zIndex: 1 }}>
            {highlightCode(editedContent)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VM TERMINAL
// Browser-based SSH/SFTP terminal emulator for isolated VM access
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Send, Trash2, Copy } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: string;
}

const WELCOME_MESSAGE = `
╔══════════════════════════════════════════════════════════════╗
║  UptimeOps Secure VM Gateway v3.2.1                          ║
║  Isolated session: sandbox-7f3a9e2d                          ║
║  Network: isolated (no egress)                               ║
║  Encryption: ChaCha20-Poly1305                               ║
╚══════════════════════════════════════════════════════════════╝

$ `;

const COMMANDS: Record<string, { output: string; type: 'output' | 'error' }> = {
  help: {
    output: `Available commands:
  status        Show system status
  ls            List files in current directory
  cat <file>    Display file contents
  ps            List running processes
  df            Show disk usage
  netstat       Show network connections
  tail <file>   Show last 20 lines of file
  grep <pat>    Search for pattern
  exit          Close session
  clear         Clear terminal`,
    type: 'output',
  },
  status: {
    output: `System Status — acme-corp.com (sandbox-7f3a9e2d)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OS:         Ubuntu 22.04 LTS
Kernel:     5.15.0-105-generic
Uptime:     3d 14h 22m
Load:       0.42 0.38 0.35
Memory:     3.2G / 8.0G (40%)
Disk:       42G / 100G (42%)
Docker:     12 containers running
Nginx:      active (running)
PostgreSQL: active (running)
Redis:      active (running)
Node.js:    v18.19.0`,
    type: 'output',
  },
  ls: {
    output: `total 64
drwxr-xr-x  5 root root 4096 Jun 25 14:00 .
drwxr-xr-x 18 root root 4096 Jun 25 12:00 ..
-rw-r--r--  1 root root  892 Jun 25 13:30 .env.local
-rw-r--r--  1 root root  220 Jun 25 12:00 Dockerfile
-rw-r--r--  1 root root  156 Jun 25 12:00 docker-compose.yml
drwxr-xr-x  3 root root 4096 Jun 25 13:00 logs
drwxr-xr-x  4 root root 4096 Jun 25 12:00 nginx
drwxr-xr-x  8 root root 4096 Jun 25 14:00 app
-rw-r--r--  1 root root 4.2K Jun 25 13:45 package.json
-rw-r--r--  1 root root  12K Jun 25 13:00 yarn.lock`,
    type: 'output',
  },
  'cat package.json': {
    output: `{
  "name": "acme-corp-api",
  "version": "2.4.1",
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "test": "jest",
    "migrate": "knex migrate:latest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "stripe": "^12.0.0"
  }
}`,
    type: 'output',
  },
  ps: {
    output: `  PID USER      CPU  MEM  COMMAND
    1 root      0.0  0.1  /sbin/init
  512 root      0.2  1.2  nginx: master process
  518 www-data  0.1  0.8  nginx: worker process
  623 postgres  0.5  4.5  postgres: main process
  701 redis     0.1  0.6  redis-server
  834 node      2.3  8.4  node dist/server.js
  912 node      1.8  6.2  node dist/worker.js
 1023 root      0.0  0.3  sshd: root`,
    type: 'output',
  },
  df: {
    output: `Filesystem     Size  Used Avail Use% Mounted on
/dev/sda1      100G   42G   58G  42% /
tmpfs          4.0G  120M  3.9G   3% /tmp
/dev/sdb1       50G   12G   38G  24% /data`,
    type: 'output',
  },
  netstat: {
    output: `Active Internet connections
Proto Recv-Q Send-Q Local Address    Foreign Address  State
tcp        0      0 0.0.0.0:80       0.0.0.0:*        LISTEN
tcp        0      0 0.0.0.0:443      0.0.0.0:*        LISTEN
tcp        0      0 127.0.0.1:5432   0.0.0.0:*        LISTEN
tcp        0      0 127.0.0.1:6379   0.0.0.0:*        LISTEN
tcp        0      0 127.0.0.1:3000   0.0.0.0:*        LISTEN
tcp     1423      0 10.0.2.15:3000   192.168.1.45:52134 ESTABLISHED`,
    type: 'output',
  },
  'tail logs/app.log': {
    output: `[2024-06-25T14:32:01Z] ERROR: Connection pool exhausted (max: 100, active: 100, idle: 0)
[2024-06-25T14:32:05Z] WARN:  Request timeout: GET /api/v2/products
[2024-06-25T14:32:08Z] ERROR: DatabaseError: timeout expired at Query._checkTimeout
[2024-06-25T14:32:12Z] WARN:  Retrying query (attempt 2/3)
[2024-06-25T14:32:15Z] ERROR: Connection pool exhausted (max: 100, active: 100, idle: 0)
[2024-06-25T14:32:20Z] INFO:  Health check: FAIL (db latency: 5234ms)
[2024-06-25T14:32:25Z] WARN:  Circuit breaker opened for /api/v2/orders
[2024-06-25T14:32:30Z] ERROR: UnhandledPromiseRejection: pg pool drain`,
    type: 'output',
  },
  'grep ERROR logs/app.log': {
    output: `[2024-06-25T14:32:01Z] ERROR: Connection pool exhausted (max: 100, active: 100, idle: 0)
[2024-06-25T14:32:08Z] ERROR: DatabaseError: timeout expired at Query._checkTimeout
[2024-06-25T14:32:15Z] ERROR: Connection pool exhausted (max: 100, active: 100, idle: 0)
[2024-06-25T14:32:30Z] ERROR: UnhandledPromiseRejection: pg pool drain

4 matches found`,
    type: 'output',
  },
};

interface VmTerminalProps {
  incidentId: string;
  websiteUrl: string;
}

export function VmTerminal({ websiteUrl }: VmTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'welcome',
      type: 'system',
      content: WELCOME_MESSAGE,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const executeCommand = useCallback((cmd: string) => {
    const timestamp = new Date().toISOString();
    const cmdId = `cmd-${Date.now()}`;

    // Add input line
    setLines(prev => [...prev, {
      id: cmdId,
      type: 'input',
      content: `$ ${cmd}`,
      timestamp,
    }]);

    // Process command
    setTimeout(() => {
      const normalized = cmd.toLowerCase().trim();
      const matched = Object.entries(COMMANDS).find(([key]) => normalized.startsWith(key));

      if (cmd === 'clear') {
        setLines([{
          id: `clear-${Date.now()}`,
          type: 'system',
          content: WELCOME_MESSAGE,
          timestamp: new Date().toISOString(),
        }]);
        return;
      }

      if (cmd === 'exit') {
        setLines(prev => [...prev, {
          id: `exit-${Date.now()}`,
          type: 'system',
          content: '\nSession terminated. Type "reconnect" to resume.\n',
          timestamp: new Date().toISOString(),
        }]);
        setIsConnected(false);
        return;
      }

      if (normalized === 'reconnect') {
        setIsConnected(true);
        setLines(prev => [...prev, {
          id: `recon-${Date.now()}`,
          type: 'system',
          content: '\n[SYSTEM] Reconnected to sandbox-7f3a9e2d\n$ ',
          timestamp: new Date().toISOString(),
        }]);
        return;
      }

      if (matched) {
        setLines(prev => [...prev, {
          id: `out-${Date.now()}`,
          type: matched[1].type,
          content: matched[1].output,
          timestamp: new Date().toISOString(),
        }]);
      } else if (cmd) {
        setLines(prev => [...prev, {
          id: `err-${Date.now()}`,
          type: 'error',
          content: `bash: ${cmd.split(' ')[0]}: command not found\nType "help" for available commands`,
          timestamp: new Date().toISOString(),
        }]);
      }
    }, 100 + Math.random() * 200);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;
    executeCommand(input.trim());
    setInput('');
  };

  const copyToClipboard = () => {
    const text = lines.map(l => l.content).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-black border border-white/10 flex flex-col h-full">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-surface">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-lime" />
          <span className="text-xs font-bold font-mono">VM: {websiteUrl}</span>
          <span className="text-[10px] text-white/30 font-mono">sandbox-7f3a9e2d</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-lime animate-pulse' : 'bg-red-400'}`} />
          <span className="text-[10px] text-white/40">{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          <button onClick={copyToClipboard} className="p-1 text-white/30 hover:text-white/60 transition-colors" title="Copy all">
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setLines([{ id: 'clear', type: 'system', content: WELCOME_MESSAGE, timestamp: new Date().toISOString() }]);
              setIsConnected(true);
            }}
            className="p-1 text-white/30 hover:text-red-400 transition-colors"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 min-h-[300px] max-h-[500px]">
        {lines.map((line) => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap break-all ${
              line.type === 'input' ? 'text-cyan' :
              line.type === 'error' ? 'text-red-400' :
              line.type === 'system' ? 'text-white/40' :
              'text-white/70'
            }`}
          >
            {line.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/10 p-2 flex items-center gap-2">
        <span className="text-lime font-mono text-xs font-bold">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!isConnected}
          className="flex-1 bg-transparent font-mono text-xs text-white/80 outline-none placeholder:text-white/20"
          placeholder={isConnected ? "Type command..." : "Disconnected. Type 'reconnect' to resume..."}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={!isConnected || !input.trim()}
          className="p-1.5 text-white/30 hover:text-lime transition-colors disabled:opacity-30"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
}

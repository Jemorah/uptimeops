// ═══════════════════════════════════════════════════════════════
// TAB 5: SUBMIT FIX
// Fix summary, files changed (auto-populated), test results,
// confidence self-assessment, coordinator approval queue
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Send, FileText, CheckCircle, AlertTriangle, GitPullRequest,
  TestTube, ThumbsUp, Clock, RotateCcw, Sparkles,
  GitCommit, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface SubmitFixPanelProps {
  incidentId: string;
  onSubmit?: () => void;
}

interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: string;
  message?: string;
}

const AUTO_FILES: FileChange[] = [
  { path: 'config/database.js', status: 'modified', linesAdded: 4, linesRemoved: 0 },
  { path: 'config/database.js.bak', status: 'added', linesAdded: 22, linesRemoved: 0 },
  { path: 'tests/db-connection-stress.js', status: 'modified', linesAdded: 12, linesRemoved: 3 },
];

const TEST_RESULTS: TestResult[] = [
  { name: 'Connection Pool Limit', status: 'pass', duration: '1.2s', message: 'Handles 100 concurrent connections' },
  { name: 'Timeout Behavior', status: 'pass', duration: '0.8s', message: 'Drops stale connections after 30s' },
  { name: 'Error Recovery', status: 'pass', duration: '2.1s', message: 'Retries 3x on transient failure' },
  { name: 'Memory Stability', status: 'pass', duration: '5.4s', message: 'RSS stable at ~45MB over 5min' },
  { name: 'Failover Config', status: 'pass', duration: '0.3s', message: 'Secondary pool registered' },
];

type ConfidenceLevel = 'high' | 'medium' | 'low' | null;

export function SubmitFixPanel({ incidentId, onSubmit }: SubmitFixPanelProps) {
  const [summary, setSummary] = useState('');
  const [confidence, setConfidence] = useState<ConfidenceLevel>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const summaryChars = summary.length;
  const summaryMin = 50;
  const isSummaryValid = summaryChars >= summaryMin;

  const handleSubmit = () => {
    if (!isSummaryValid || !confidence) {
      toast.error('Please provide a summary (50+ chars) and select confidence level');
      return;
    }
    setIsSubmitting(true);
    toast.info('Submitting fix for coordinator review...');

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success('Fix submitted — entered HQ approval queue');
      onSubmit?.();
    }, 2000);
  };

  const handleCopy = () => {
    const text = `FIX SUMMARY for ${incidentId}:\n\n${summary}\n\nFiles changed:\n${AUTO_FILES.map(f => `- ${f.path} (${f.status}, +${f.linesAdded}/-${f.linesRemoved})`).join('\n')}\n\nConfidence: ${confidence?.toUpperCase()}\nTests: ${TEST_RESULTS.filter(t => t.status === 'pass').length}/${TEST_RESULTS.length} passed`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Fix details copied');
  };

  const passedCount = TEST_RESULTS.filter(t => t.status === 'pass').length;
  const totalTests = TEST_RESULTS.length;

  return (
    <div className="space-y-4">
      {/* ── Submission Status ── */}
      {submitted ? (
        <div className="bg-green-500/5 border border-green-500/20 p-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-black text-green-400 mb-1">Fix Submitted</h3>
          <p className="text-xs text-white/40 mb-1">{incidentId} is now in the coordinator approval queue.</p>
          <p className="text-[10px] text-white/30 font-mono">Approval typically takes 2-5 minutes</p>
          <Button
            onClick={() => { setSubmitted(false); setSummary(''); setConfidence(null); }}
            variant="outline"
            className="mt-4 border-white/10 text-white/60 hover:bg-white/5 text-xs h-8"
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            New Submission
          </Button>
        </div>
      ) : (
        <>
          {/* ── Fix Summary ── */}
          <div className="bg-surface border border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-cyan" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Fix Summary</span>
              </div>
              <span className={`text-[10px] font-mono ${isSummaryValid ? 'text-green-400' : 'text-white/30'}`}>
                {summaryChars} / {summaryMin} min
              </span>
            </div>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={`Describe what you fixed, why, and how you verified it...\n\nExample:\n- Added connection pool limits (max: 20) to prevent exhaustion\n- Set idle timeout (30s) to reclaim stale connections\n- Added connection timeout (5s) for faster failure detection\n- Verified with 5 integration tests, all passing`}
              className="min-h-[140px] bg-black border-white/10 text-xs text-white/80 placeholder:text-white/20 resize-none focus:border-lime/30 focus:ring-lime/10"
            />
            {!isSummaryValid && summaryChars > 0 && (
              <p className="text-[10px] text-yellow-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Minimum {summaryMin} characters required
              </p>
            )}
          </div>

          {/* ── Files Changed (Auto-populated) ── */}
          <div className="bg-surface border border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-3.5 h-3.5 text-lime" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Files Changed</span>
              </div>
              <span className="text-[9px] text-white/30 font-mono">Auto-populated from VM</span>
            </div>
            <div className="space-y-1.5">
              {AUTO_FILES.map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-black border border-white/5">
                  <GitCommit className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-xs font-mono text-white/70 flex-1 truncate">{file.path}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${
                    file.status === 'modified' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    file.status === 'added' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {file.status}
                  </span>
                  <span className="text-[10px] text-green-400 font-mono">+{file.linesAdded}</span>
                  <span className="text-[10px] text-red-400 font-mono">-{file.linesRemoved}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Test Results ── */}
          <div className="bg-surface border border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TestTube className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Test Results</span>
              </div>
              <span className="text-[9px] text-white/30 font-mono">{passedCount}/{totalTests} passed</span>
            </div>
            <div className="space-y-1.5">
              {TEST_RESULTS.map((test, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-black border border-white/5">
                  {test.status === 'pass' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  ) : test.status === 'fail' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                  )}
                  <span className="text-xs text-white/70 flex-1">{test.name}</span>
                  <span className="text-[10px] text-white/30 font-mono">{test.duration}</span>
                  {test.message && (
                    <span className="text-[9px] text-white/30 truncate max-w-[200px]">{test.message}</span>
                  )}
                </div>
              ))}
            </div>
            {/* Overall test status */}
            <div className={`mt-2 p-2 border text-center ${
              passedCount === totalTests
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-yellow-500/5 border-yellow-500/20'
            }`}>
              <span className={`text-[10px] font-bold ${
                passedCount === totalTests ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {passedCount === totalTests ? 'All tests passing — ready to submit' : `${totalTests - passedCount} test(s) failing — review recommended`}
              </span>
            </div>
          </div>

          {/* ── Confidence Self-Assessment ── */}
          <div className="bg-surface border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="w-3.5 h-3.5 text-white/40" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">Confidence Assessment</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'high', label: 'HIGH', desc: 'Fully verified', color: 'border-green-500/30 text-green-400 hover:bg-green-500/10 bg-green-500/5' },
                { key: 'medium', label: 'MEDIUM', desc: 'Mostly verified', color: 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 bg-yellow-500/5' },
                { key: 'low', label: 'LOW', desc: 'Needs review', color: 'border-red-500/30 text-red-400 hover:bg-red-500/10 bg-red-500/5' },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setConfidence(opt.key)}
                  className={`p-3 border text-center transition-all ${
                    confidence === opt.key
                      ? opt.color + ' ring-1 ring-current'
                      : 'border-white/10 bg-white/[0.02] text-white/30 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs font-black block">{opt.label}</span>
                  <span className="text-[9px] opacity-60">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Submit Actions ── */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!isSummaryValid || !confidence || isSubmitting}
              className="bg-lime text-black hover:bg-lime/90 font-bold text-xs h-10 px-6 disabled:opacity-30"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Submit for Approval
                </>
              )}
            </Button>
            <Button
              onClick={handleCopy}
              variant="outline"
              className="border-white/10 text-white/60 hover:bg-white/5 text-xs h-10"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copied ? 'Copied' : 'Copy Details'}
            </Button>
            {!isSummaryValid && (
              <span className="text-[10px] text-yellow-400 ml-auto">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Complete all fields to submit
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

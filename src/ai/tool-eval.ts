/**
 * Tool-choice eval for the Co-Pilot (pure; see tests/ai-tool-eval.test.ts, run with `npm run kb:tools`).
 *
 * Each case is a message, a role, and what the model should do FIRST: which tool it reaches for (any of a list), or
 * that it should call none. It is graded on the first call because that is the choice that matters and the only one
 * that is stable without a database (the run strips credentials so nothing can write, so later steps of a chain can
 * fail). Cases can also name tools that must NEVER be called for that message, which is how "how do I add a contact?"
 * is told apart from "add a contact", and "move my 3pm" from "book a 3pm".
 */
export interface ToolEvalCase {
  id: string;
  say: string;
  role: 'super_admin' | 'org_admin' | 'editor' | 'viewer';
  /** Earlier turns, for a reply that only makes sense in context. */
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  /** The first tool must be one of these. */
  first?: readonly string[];
  /** No tool should be called at all. */
  none?: boolean;
  /** None of these may be called at any point. */
  forbid?: readonly string[];
}

export interface ToolEvalGrade {
  pass: boolean;
  reason: string;
}

export const WRITE_TOOLS = ['createTask', 'createProject', 'createContact', 'createAppointment', 'changeEvent', 'updateContact'] as const;
export const DATA_TOOLS = ['getTimeSummary', 'getInvoices', 'getQuotes', 'getCalendar'] as const;

export function gradeToolChoice(testCase: ToolEvalCase, called: readonly string[]): ToolEvalGrade {
  const banned = (testCase.forbid ?? []).filter((name) => called.includes(name));
  if (banned.length > 0) return { pass: false, reason: `called ${banned.join(', ')}, which it must not for this message` };
  if (testCase.none) {
    return called.length === 0 ? { pass: true, reason: 'no tool, as expected' } : { pass: false, reason: `expected no tool, called ${called.join(', ')}` };
  }
  const wanted = testCase.first ?? [];
  if (wanted.length === 0) return { pass: true, reason: 'nothing required' };
  if (called.length === 0) return { pass: false, reason: `expected ${wanted.join(' or ')}, called no tool` };
  return wanted.includes(called[0])
    ? { pass: true, reason: `first call ${called[0]}` }
    : { pass: false, reason: `expected ${wanted.join(' or ')} first, got ${called[0]}` };
}

export interface ToolEvalRate {
  id: string;
  say: string;
  passes: number;
  runs: number;
  /** What was called on each failing run, so a flaky case shows how it fails. */
  failedCalls: string[][];
}

/**
 * The same case run several times, because the model is not deterministic: one run cannot tell a prompt fix from
 * luck. A case is "stable" when every run passed, "flaky" when some did, "broken" when none did.
 */
export function rateToolChoice(testCase: ToolEvalCase, runs: ReadonlyArray<readonly string[]>): ToolEvalRate {
  const failedCalls = runs.filter((called) => !gradeToolChoice(testCase, called).pass).map((called) => [...called]);
  return { id: testCase.id, say: testCase.say, passes: runs.length - failedCalls.length, runs: runs.length, failedCalls };
}

export function classifyRate(rate: Pick<ToolEvalRate, 'passes' | 'runs'>): 'stable' | 'flaky' | 'broken' {
  if (rate.runs > 0 && rate.passes === rate.runs) return 'stable';
  return rate.passes === 0 ? 'broken' : 'flaky';
}

export interface ToolEvalSummary {
  passed: number;
  total: number;
  failures: Array<{ id: string; say: string; reason: string; called: string[] }>;
}

export function summarizeToolEval(results: ReadonlyArray<{ testCase: ToolEvalCase; called: readonly string[] }>): ToolEvalSummary {
  const failures: ToolEvalSummary['failures'] = [];
  for (const { testCase, called } of results) {
    const grade = gradeToolChoice(testCase, called);
    if (!grade.pass) failures.push({ id: testCase.id, say: testCase.say, reason: grade.reason, called: [...called] });
  }
  return { passed: results.length - failures.length, total: results.length, failures };
}

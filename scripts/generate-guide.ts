import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

dotenv.config({ path: ".env.local" });

const MAX_INIT_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LOGIN_EMAIL = process.env.OGEEMO_LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.OGEEMO_LOGIN_PASSWORD;

const INITIAL_LOGIN_UI_WAIT_MS = 25000;
const POST_LOGIN_CLICK_WAIT_MS = 15000;
const POLL_INTERVAL_MS = 500;
const DEFAULT_FINAL_URL_KEYWORDS = ["reports", "backup", "work-activity", "export"];
const DEFAULT_ALLOWED_LOCAL_HOSTS = ["localhost", "127.0.0.1"];

async function firstExistingLocator(page: any, selectors: string[]) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) {
      return locator;
    }
  }
  return null;
}

async function writeLoginDebugSnapshot(page: any, label: string) {
  try {
    const debugDir = path.join(process.cwd(), "dev", "stagehand-login-debug");
    fs.mkdirSync(debugDir, { recursive: true });

    const safeLabel = label.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const screenshotPath = path.join(debugDir, `${safeLabel}-${Date.now()}.png`);
    const currentUrl = await page.url();

    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[login-debug] label=${label} url=${currentUrl} screenshot=${screenshotPath}`);
  } catch (error) {
    console.warn("[login-debug] Failed to write debug snapshot", error);
  }
}

async function getFinalUiContext(page: any) {
  try {
    const currentUrl = await page.url();
    const headingTexts = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h1, h2, h3, [role='heading']"))
        .map((el) => (el.textContent ?? "").trim())
    );
    const buttonTexts = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button, a, [role='button']"))
        .map((el) => (el.textContent ?? "").trim())
    );

    const normalize = (values: string[]) =>
      Array.from(
        new Set(
          values
            .map((text) => text.replace(/\s+/g, " ").trim())
            .filter((text) => text.length > 1)
        )
      );

    const headings = normalize(headingTexts).slice(0, 12);
    const actions = normalize(buttonTexts).slice(0, 20);

    return [
      `URL: ${currentUrl}`,
      `Visible headings: ${headings.join(" | ") || "none"}`,
      `Visible actions: ${actions.join(" | ") || "none"}`,
    ].join("\n");
  } catch (error) {
    console.warn("Failed to capture final UI context for extraction.", error);
    return "URL/headings/actions context unavailable.";
  }
}

function persistGuideOutput(payload: unknown) {
  const guidesDir = path.join(process.cwd(), "dev", "guides");
  fs.mkdirSync(guidesDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(guidesDir, `guide-${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Saved guide output to ${outputPath}`);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function envOrDefault(name: string, defaultValue: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : defaultValue;
}

function getExpectedFinalUrlKeywords() {
  const configured = process.env.EXPECTED_FINAL_URL_KEYWORDS;
  if (!configured) {
    return DEFAULT_FINAL_URL_KEYWORDS;
  }

  const parsed = configured
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  return parsed.length > 0 ? parsed : DEFAULT_FINAL_URL_KEYWORDS;
}

function assertExpectedFinalUrlOrThrow(finalUrl: string) {
  const expectedKeywords = getExpectedFinalUrlKeywords();
  const normalizedUrl = finalUrl.toLowerCase();
  const matchedKeyword = expectedKeywords.find((keyword) => normalizedUrl.includes(keyword));

  if (!matchedKeyword) {
    throw new Error(
      `Guardrail blocked extraction: final URL '${finalUrl}' did not match expected sections (${expectedKeywords.join(", ")}).`
    );
  }

  console.log(
    `Final URL guardrail passed with keyword '${matchedKeyword}' for URL: ${finalUrl}`
  );
}

function getAllowedAgentHosts(targetUrl: string) {
  const fromEnv = process.env.ALLOWED_AGENT_HOSTS
    ?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0) ?? [];

  const targetHost = new URL(targetUrl).hostname.toLowerCase();
  return Array.from(new Set([...fromEnv, targetHost, ...DEFAULT_ALLOWED_LOCAL_HOSTS]));
}

function assertNoExternalActionUrlsOrThrow(actions: any[] | undefined, allowedHosts: string[]) {
  if (!actions || actions.length === 0) {
    return;
  }

  const externalUrls = actions
    .map((action) => ("pageUrl" in action && typeof action.pageUrl === "string" ? action.pageUrl : null))
    .filter((url): url is string => Boolean(url))
    .filter((url) => {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        return !allowedHosts.includes(hostname);
      } catch {
        return false;
      }
    });

  if (externalUrls.length > 0) {
    const preview = Array.from(new Set(externalUrls)).slice(0, 3).join(", ");
    throw new Error(
      `Guardrail blocked extraction: agent navigated off allowed hosts. Found external URL(s): ${preview}`
    );
  }
}

function isConnRefusedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ECONNREFUSED"
  );
}

async function loginIfConfigured(page: any) {
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    console.log("No optional login credentials provided. Continuing without authenticated login.");
    return false;
  }

  try {
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id*="email" i]',
      'input[placeholder*="email" i]',
      'input[autocomplete="email"]',
    ];
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id*="password" i]',
      'input[placeholder*="password" i]',
      'input[autocomplete="current-password"]',
    ];
    const landingLoginSelectors = [
      'button:has-text("Login to Ogeemo Suite")',
      'a:has-text("Login to Ogeemo Suite")',
      'button:has-text("Login")',
      'a:has-text("Login")',
      'button:has-text("Sign In")',
      'a:has-text("Sign In")',
    ];
    const submitSelectors = [
      'button:has-text("Sign In")',
      'button:has-text("Sign in")',
      'button:has-text("Log In")',
      'button:has-text("Login")',
      'button[type="submit"]',
    ];

    await writeLoginDebugSnapshot(page, "pre-login-attempt");

    // Wait for either a login form or landing login button to appear.
    let emailInput = await firstExistingLocator(page, emailSelectors);
    let passwordInput = await firstExistingLocator(page, passwordSelectors);
    let loginButton = await firstExistingLocator(page, landingLoginSelectors);

    const initialWaitDeadline = Date.now() + INITIAL_LOGIN_UI_WAIT_MS;
    let hasLoginForm = false;
    let hasLandingLoginButton = false;

    while (Date.now() < initialWaitDeadline) {
      emailInput = await firstExistingLocator(page, emailSelectors);
      passwordInput = await firstExistingLocator(page, passwordSelectors);
      loginButton = await firstExistingLocator(page, landingLoginSelectors);

      hasLoginForm = emailInput !== null && passwordInput !== null;
      hasLandingLoginButton = loginButton !== null;

      if (hasLoginForm || hasLandingLoginButton) {
        break;
      }
      await page.waitForTimeout(POLL_INTERVAL_MS);
    }

    if (!hasLoginForm && hasLandingLoginButton && loginButton) {
      await loginButton.click();

      const loginFormDeadline = Date.now() + POST_LOGIN_CLICK_WAIT_MS;
      while (Date.now() < loginFormDeadline) {
        emailInput = await firstExistingLocator(page, emailSelectors);
        passwordInput = await firstExistingLocator(page, passwordSelectors);
        hasLoginForm = emailInput !== null && passwordInput !== null;

        if (hasLoginForm) {
          break;
        }
        await page.waitForTimeout(POLL_INTERVAL_MS);
      }
    }

    const emailAfterNav = await firstExistingLocator(page, emailSelectors);
    const passwordAfterNav = await firstExistingLocator(page, passwordSelectors);
    const canLogin = emailAfterNav !== null && passwordAfterNav !== null;

    if (!canLogin) {
      console.warn("Login credentials were provided, but no login form was found.");
      await writeLoginDebugSnapshot(page, "login-form-not-found");
      return false;
    }

    await emailAfterNav.fill(LOGIN_EMAIL);
    await passwordAfterNav.fill(LOGIN_PASSWORD);

    const signInButton = await firstExistingLocator(page, submitSelectors);
    if (signInButton) {
      await signInButton.click();
      await page.waitForTimeout(2500);
    } else {
      await passwordAfterNav.press("Enter");
      await page.waitForTimeout(2500);
    }

    await writeLoginDebugSnapshot(page, "post-login-submit");
    console.log("Optional login attempted using env credentials.");
    return true;
  } catch (error) {
    console.warn("Optional login attempt failed. Continuing without login.", error);
    return false;
  }
}

/**
 * Generates a human-readable guide of an autonomous UI workflow.
 * Run with:
 *   npx tsx scripts/generate-guide.ts
 */
async function main() {
  const configuredEnv = (process.env.STAGEHAND_ENV ?? "LOCAL").toUpperCase();

  if (configuredEnv !== "LOCAL") {
    throw new Error(
      `This script is configured for LOCAL only. Received STAGEHAND_ENV="${configuredEnv}".`
    );
  }

  if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "Missing Google API key. Set GOOGLE_API_KEY (and/or GOOGLE_GENERATIVE_AI_API_KEY) in .env.local."
    );
  }

  // Use your requested sample target; override with TARGET_URL if needed.
  // Example:
  // TARGET_URL=http://localhost:9002/dashboard npx tsx scripts/generate-guide.ts
  const targetUrl = process.env.TARGET_URL ?? "http://localhost:3000/dashboard";
  const allowedHosts = getAllowedAgentHosts(targetUrl);

  let stagehand: Stagehand | undefined;

  try {
    stagehand = new Stagehand({
      env: "LOCAL",
      model: "google/gemini-2.5-pro",
      // For local debugging, headless false is helpful.
      localBrowserLaunchOptions: {
        headless: false,
      },
      verbose: 1,
    });

    for (let attempt = 1; attempt <= MAX_INIT_ATTEMPTS; attempt += 1) {
      try {
        await stagehand.init();
        break;
      } catch (error) {
        const isLastAttempt = attempt === MAX_INIT_ATTEMPTS;
        if (!isConnRefusedError(error) || isLastAttempt) {
          throw error;
        }

        console.warn(
          `Stagehand init ECONNREFUSED on attempt ${attempt}/${MAX_INIT_ATTEMPTS}. Retrying...`
        );
        await sleep(1000 * attempt);
      }
    }

    const page = stagehand.context.pages()[0];
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    const didAttemptLogin = await loginIfConfigured(page);

    const agent = stagehand.agent({
      mode: "cua",
      model: "google/gemini-2.5-computer-use-preview-10-2025",
      systemPrompt:
        "You are a QA automation assistant. Navigate carefully and prioritize stable, user-visible UI actions.",
    });

    const workflowInstruction = didAttemptLogin
      ? "You are already authenticated. Find the Analytics tab and navigate to the export reports section. " +
      "If labels differ, identify the closest equivalent navigation path. " +
      "Stop after you reach the export reports screen."
      : "Find the Analytics tab and navigate to the export reports section. " +
      "If labels differ, identify the closest equivalent navigation path. " +
      "Stop after you reach the export reports screen.";

    const constrainedWorkflowInstruction =
      `${workflowInstruction} ` +
      `Do not navigate away from these hosts: ${allowedHosts.join(", ")}. ` +
      "Never open external domains, new tabs, or third-party sites.";

    const agentResult = await agent.execute({
      instruction: constrainedWorkflowInstruction,
      maxSteps: 25,
      highlightCursor: true,
    });

    assertNoExternalActionUrlsOrThrow(agentResult.actions, allowedHosts);

    // Turn agent action trace into a compact textual context for extraction.
    const actionContext = (agentResult.actions ?? [])
      .map((a, i) => {
        const actionText = "action" in a && typeof a.action === "string" ? a.action : "";
        const urlText = "pageUrl" in a && typeof a.pageUrl === "string" ? a.pageUrl : "";
        return `${i + 1}. ${a.type}${actionText ? ` - ${actionText}` : ""}${urlText ? ` (url: ${urlText})` : ""}`;
      })
      .join("\n");

    const finalUrl = await page.url();
    assertExpectedFinalUrlOrThrow(finalUrl);

    const finalUiContext = await getFinalUiContext(page);

    const GuideSchema = z.object({
      title: z.string().min(1).describe("Short title for this user guide"),
      module: z
        .string()
        .min(1)
        .describe("Feature area/module this workflow belongs to, e.g., reports, contacts, payroll"),
      intent: z
        .string()
        .min(1)
        .describe("Primary user intent, e.g., export reports, create contact, run payroll"),
      targetAudience: z
        .string()
        .min(1)
        .describe("Primary audience for this guide, e.g., admin, accountant, bookkeeper"),
      description: z
        .string()
        .min(1)
        .describe("One paragraph describing what the workflow accomplishes"),
      prerequisites: z
        .array(z.string().min(1))
        .min(1)
        .describe("Required access, setup, or context before starting the workflow"),
      steps: z
        .array(z.string().min(1))
        .min(3)
        .describe("Ordered, human-readable UI steps (clicks/interactions) performed"),
      validations: z
        .array(z.string().min(1))
        .min(1)
        .describe("How the user can verify the workflow succeeded"),
      commonErrors: z
        .array(z.string().min(1))
        .min(1)
        .describe("Likely failure points a user might hit while following this workflow"),
      recovery: z
        .array(z.string().min(1))
        .min(1)
        .describe("Practical recovery steps for each likely failure mode"),
      faq: z
        .array(
          z.object({
            question: z.string().min(1),
            answer: z.string().min(1),
          })
        )
        .min(1)
        .describe("Short FAQ entries that answer common follow-up questions"),
      keywords: z
        .array(z.string().min(1))
        .min(3)
        .describe("Search-oriented keywords and synonyms relevant to this workflow"),
    });

    const guide = await stagehand.extract(
      [
        "Create a concise end-user guide for the workflow just completed.",
        "Use the current page plus the action trace below as context.",
        "Output strictly according to the provided schema.",
        "Do not invent features that are not visible or implied by the observed workflow.",
        "If unknown, make conservative wording and avoid fabricated specifics.",
        "",
        `Workflow objective: ${constrainedWorkflowInstruction}`,
        `Expected module: ${envOrDefault("GUIDE_MODULE", "reports")}`,
        `Expected intent: ${envOrDefault("GUIDE_INTENT", "export-reports")}`,
        `Expected audience: ${envOrDefault("GUIDE_TARGET_AUDIENCE", "general")}`,
        "",
        "Final visible page context:",
        finalUiContext,
        "",
        "Action trace:",
        actionContext || "No detailed action trace available.",
      ].join("\n"),
      GuideSchema
    );

    const generatedAt = new Date().toISOString();
    const guideVersion = envOrDefault("GUIDE_VERSION", "1.0.0");
    const moduleValue = guide.module?.trim() || envOrDefault("GUIDE_MODULE", "general");
    const intentValue = guide.intent?.trim() || envOrDefault("GUIDE_INTENT", "general-workflow");
    const guideId = `${slugify(moduleValue)}--${slugify(intentValue)}`;

    const normalizedGuide = {
      guideId,
      title: guide.title,
      module: moduleValue,
      intent: intentValue,
      targetAudience: guide.targetAudience,
      description: guide.description,
      prerequisites: guide.prerequisites,
      steps: guide.steps,
      validations: guide.validations,
      commonErrors: guide.commonErrors,
      recovery: guide.recovery,
      faq: guide.faq,
      keywords: guide.keywords,
      version: guideVersion,
      generatedAt,
      lastVerifiedAt: generatedAt,
      source: {
        targetUrl,
        finalUrl,
        workflowInstruction: constrainedWorkflowInstruction,
        allowedHosts,
        finalUiContext,
      },
      actionTrace: actionContext,
    };

    persistGuideOutput({
      ...normalizedGuide,
    });

    console.log(JSON.stringify(normalizedGuide, null, 2));
  } catch (error) {
    console.error("Failed to generate guide:", error);
    process.exitCode = 1;
  } finally {
    if (stagehand) {
      await stagehand.close();
    }
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "SKILL.md",
  "README.md",
  "references/brief-intake.md",
  "references/product-research.md",
  "references/tikhub-data-map.md",
  "references/creator-evaluation.md",
  "references/pricing-and-budget.md",
  "references/output-contract.md",
  "scripts/score_candidates.mjs",
  "examples/sample-brief.md",
  "examples/sample-candidates.json",
];

const errors = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(skillDir, relative))) {
    errors.push(`Missing ${relative}`);
  }
}

const skillPath = path.join(skillDir, "SKILL.md");
if (fs.existsSync(skillPath)) {
  const skill = fs.readFileSync(skillPath, "utf8");
  if (!skill.startsWith("---\n")) errors.push("SKILL.md needs YAML frontmatter");
  if (!skill.includes("name: tencent-cloud-overseas-kol-sourcing")) {
    errors.push("SKILL.md name is incorrect");
  }
  for (const phrase of [
    "Brief gate",
    "Product truth gate",
    "Budget gate",
    "Collaboration gate",
    "TIKHUB_API_KEY",
  ]) {
    if (!skill.includes(phrase)) errors.push(`SKILL.md missing ${phrase}`);
  }
}

const secretPattern = /(TIKHUB_API_KEY\s*=\s*["']?[A-Za-z0-9_-]{16,})|(github_pat_[A-Za-z0-9_]+)/;
for (const relative of required) {
  const absolute = path.join(skillDir, relative);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) continue;
  const content = fs.readFileSync(absolute, "utf8");
  if (secretPattern.test(content)) errors.push(`Possible secret in ${relative}`);
}

for (const script of ["scripts/score_candidates.mjs", "scripts/validate_skill.mjs"]) {
  const check = spawnSync(process.execPath, ["--check", path.join(skillDir, script)], {
    encoding: "utf8",
  });
  if (check.status !== 0) {
    errors.push(`${script} syntax error: ${check.stderr.trim()}`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Skill validation passed: ${required.length} required files, frontmatter, gates, scripts, and secret scan.`);

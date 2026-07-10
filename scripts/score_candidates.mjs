#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const WEIGHTS = {
  productContentFit: 25,
  audienceMarketFit: 20,
  performanceQuality: 15,
  collaborationLikelihood: 15,
  budgetFit: 15,
  brandSafetyDelivery: 10,
};

const REQUIRED_GATES = [
  "platform",
  "language",
  "geography",
  "contentFit",
  "budget",
  "timing",
  "brandSafety",
];

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function readInput(file) {
  if (!file) {
    fail("Usage: node scripts/score_candidates.mjs <input.json> [--json]");
  }
  const absolute = path.resolve(file);
  try {
    return JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    fail(`Cannot read ${absolute}: ${error.message}`);
  }
}

function validate(input) {
  const campaign = input.campaign ?? {};
  if (!campaign.currency || !Number.isFinite(campaign.totalBudget)) {
    fail("campaign.currency and campaign.totalBudget are required");
  }
  if (!Array.isArray(input.candidates) || input.candidates.length === 0) {
    fail("candidates must be a non-empty array");
  }

  for (const candidate of input.candidates) {
    if (!candidate.name || !candidate.scores || !candidate.quote) {
      fail("Every candidate needs name, scores, and quote");
    }
    for (const key of Object.keys(WEIGHTS)) {
      const value = candidate.scores[key];
      if (!Number.isFinite(value) || value < 0 || value > 5) {
        fail(`${candidate.name}: scores.${key} must be between 0 and 5`);
      }
    }
    for (const key of ["low", "base", "high"]) {
      if (!Number.isFinite(candidate.quote[key]) || candidate.quote[key] < 0) {
        fail(`${candidate.name}: quote.${key} must be a non-negative number`);
      }
    }
    if (!(candidate.quote.low <= candidate.quote.base &&
          candidate.quote.base <= candidate.quote.high)) {
      fail(`${candidate.name}: quote must satisfy low <= base <= high`);
    }
    if (candidate.quote.currency &&
        candidate.quote.currency !== campaign.currency) {
      fail(`${candidate.name}: quote currency must match campaign currency`);
    }
  }
}

function weightedScore(scores) {
  return Number(Object.entries(WEIGHTS)
    .reduce((sum, [key, weight]) => sum + (scores[key] / 5) * weight, 0)
    .toFixed(1));
}

function failedGates(candidate) {
  const gates = candidate.hardGates ?? {};
  return REQUIRED_GATES.filter((gate) => gates[gate] !== true);
}

function combinations(items, minSize, maxSize) {
  const output = [];
  function visit(start, current) {
    if (current.length >= minSize) output.push([...current]);
    if (current.length === maxSize) return;
    for (let index = start; index < items.length; index += 1) {
      current.push(items[index]);
      visit(index + 1, current);
      current.pop();
    }
  }
  visit(0, []);
  return output;
}

function sum(combo, key) {
  return combo.reduce((total, item) => total + item.quote[key], 0);
}

function statusFor(costs, available) {
  if (costs.high <= available) return "稳妥";
  if (costs.base <= available) return "可行";
  if (costs.low <= available) return "可谈";
  return "不建议";
}

function portfolioBonus(combo) {
  const roles = new Set(combo.map((item) => item.role).filter(Boolean)).size;
  const platforms = new Set(combo.flatMap((item) => item.platforms ?? [])).size;
  return Math.min(Math.max(roles - 1, 0) * 2, 4) +
    Math.min(Math.max(platforms - 1, 0), 2);
}

function analyze(input) {
  const campaign = input.campaign;
  const reservePct = campaign.reservePct ?? 0.15;
  const fixedCosts = campaign.fixedCosts ?? 0;
  const availableBudget =
    Math.floor(campaign.totalBudget * (1 - reservePct) - fixedCosts);

  const evaluated = input.candidates.map((candidate) => {
    const score = weightedScore(candidate.scores);
    const gateFailures = failedGates(candidate);
    const thresholdFailures = [];
    if (score < 70) thresholdFailures.push("score<70");
    if (candidate.scores.productContentFit < 3) {
      thresholdFailures.push("productContentFit<3");
    }
    if (candidate.scores.collaborationLikelihood < 3) {
      thresholdFailures.push("collaborationLikelihood<3");
    }
    return {
      ...candidate,
      score,
      gateFailures,
      thresholdFailures,
      eligible: gateFailures.length === 0 && thresholdFailures.length === 0,
    };
  });

  const eligible = evaluated.filter((item) => item.eligible);
  const minCreators = Math.max(campaign.minCreators ?? 1, 1);
  const maxCreators = Math.max(campaign.maxCreators ?? minCreators, minCreators);

  const comboRows = combinations(eligible, minCreators, maxCreators)
    .map((combo) => {
      const costs = {
        low: sum(combo, "low"),
        base: sum(combo, "base"),
        high: sum(combo, "high"),
      };
      const averageScore = Number(
        (combo.reduce((total, item) => total + item.score, 0) / combo.length)
          .toFixed(1),
      );
      const status = statusFor(costs, availableBudget);
      const rankValue = { "稳妥": 3, "可行": 2, "可谈": 1, "不建议": 0 }[status];
      return {
        names: combo.map((item) => item.name),
        roles: combo.map((item) => item.role ?? "未标注"),
        costs,
        status,
        averageScore,
        portfolioBonus: portfolioBonus(combo),
        rank: rankValue * 100 + averageScore + portfolioBonus(combo),
      };
    })
    .sort((a, b) => b.rank - a.rank);

  return {
    campaign: {
      name: campaign.name ?? "Untitled campaign",
      currency: campaign.currency,
      totalBudget: campaign.totalBudget,
      reservePct,
      fixedCosts,
      availableBudget,
    },
    evaluated,
    combinations: comboRows,
  };
}

function money(value, currency) {
  return `${currency} ${Math.round(value).toLocaleString("en-US")}`;
}

function printMarkdown(result) {
  const { campaign, evaluated } = result;
  console.log(`# ${campaign.name}`);
  console.log("");
  console.log(`- Total budget: ${money(campaign.totalBudget, campaign.currency)}`);
  console.log(`- Reserve: ${(campaign.reservePct * 100).toFixed(0)}%`);
  console.log(`- Fixed costs: ${money(campaign.fixedCosts, campaign.currency)}`);
  console.log(`- Available creator budget: ${money(campaign.availableBudget, campaign.currency)}`);
  console.log("");
  console.log("## Candidates");
  console.log("");
  console.log("| Creator | Score | Eligible | Quote low/base/high | Evidence |");
  console.log("| --- | ---: | --- | --- | --- |");
  for (const item of [...evaluated].sort((a, b) => b.score - a.score)) {
    const reasons = [...item.gateFailures, ...item.thresholdFailures];
    const eligible = item.eligible ? "Yes" : `No: ${reasons.join(", ")}`;
    const quote = ["low", "base", "high"]
      .map((key) => money(item.quote[key], campaign.currency))
      .join(" / ");
    console.log(`| ${item.name} | ${item.score} | ${eligible} | ${quote} | ${item.evidenceConfidence ?? "unknown"} |`);
  }

  console.log("");
  console.log("## Top combinations");
  console.log("");
  console.log("| Status | Creators | Roles | Avg score | Low/base/high |");
  console.log("| --- | --- | --- | ---: | --- |");
  for (const combo of result.combinations.slice(0, 10)) {
    const quote = ["low", "base", "high"]
      .map((key) => money(combo.costs[key], campaign.currency))
      .join(" / ");
    console.log(`| ${combo.status} | ${combo.names.join(" + ")} | ${combo.roles.join(" + ")} | ${combo.averageScore} | ${quote} |`);
  }

  if (result.combinations.length === 0) {
    console.log("No combination passed the hard gates and recommendation thresholds.");
  }
}

const args = process.argv.slice(2);
const input = readInput(args.find((arg) => !arg.startsWith("--")));
validate(input);
const result = analyze(input);

if (args.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printMarkdown(result);
}

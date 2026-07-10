# Tencent Cloud Overseas KOL Sourcing Skill

一个面向腾讯云海外内容营销的可复用达人筛选 skill。它把模糊 brief、产品调研、TikHub 社媒数据、报价预测、品牌合作可行性和预算组合放进同一套有硬门槛的工作流。

## 它解决什么

- Brief 不清楚时分批追问，先锁定真正会改变名单的条件。
- 强制研究腾讯云产品，不允许先找大号再硬套产品。
- 区分达人所在地和受众所在地。
- 用近期中位表现、相关内容和商业合作信号评估 creator。
- 只把预算与合作概率真实可行的人放进主推名单。
- 输出 low/base/high 报价、组合预算和证据置信度。
- 保留 TikHub、网页、官方产品资料和人工派生指标的来源边界。

## 目录

```text
.
├── SKILL.md
├── references/
│   ├── brief-intake.md
│   ├── product-research.md
│   ├── tikhub-data-map.md
│   ├── creator-evaluation.md
│   ├── pricing-and-budget.md
│   └── output-contract.md
├── scripts/
│   ├── score_candidates.mjs
│   └── validate_skill.mjs
└── examples/
    ├── sample-brief.md
    └── sample-candidates.json
```

## 本机安装

把仓库放在任意稳定目录，然后链接到 Codex skills：

```bash
ln -s "/absolute/path/to/tencent-cloud-overseas-kol-sourcing-skill" \
  "$HOME/.codex/skills/tencent-cloud-overseas-kol-sourcing"
```

从 GitHub skill 集合安装：

```bash
npx skills add AOMJ2PMP/tencent-cloud-overseas-kol-sourcing-skill
```

重新开启一个 Codex task 后，可以这样触发：

> 用 tencent-cloud-overseas-kol-sourcing 帮我为这个腾讯云产品找海外 YouTube/X 达人。先检查 brief，缺什么就问我。

## TikHub

skill 不保存 API key。运行 TikHub 前确保：

```bash
export TIKHUB_API_KEY="..."
```

先用 `tikhub-find-endpoint` 查当前 endpoint，再调用 REST/MCP。批量抓取需设置分页上限，并记录抓取日期和样本量。

## 验证

```bash
node scripts/validate_skill.mjs
node scripts/score_candidates.mjs examples/sample-candidates.json
node scripts/score_candidates.mjs examples/sample-candidates.json --json
```

预算脚本不会代替人工判断。候选证据、报价 prior、产品可用性和品牌风险仍需在每次 campaign 中重新验证。

## 设计原则

- Good content first：从 creator 的受众与自然内容机制出发。
- Product truth before creator fame：先知道产品为什么值得做。
- Evidence over prestige：近期表现和合作可行性高于粉丝光环。
- Feasible portfolio over wish list：主推组合必须落在可用预算内。
- Honest sponsorship：要求真实体验、事实核查和广告披露，不要求虚假背书。

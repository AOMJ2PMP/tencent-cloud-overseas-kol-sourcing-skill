# TikHub Data Map

TikHub 用于获取平台证据。端点会变化，运行时先用 endpoint discovery 查找，不要凭记忆猜路径。

## Setup

```bash
[ -z "${TIKHUB_API_KEY:-}" ] && echo "TIKHUB_API_KEY is required"
tikhub-find-endpoint "channel info" --platform youtube
tikhub-find-endpoint "channel videos" --platform youtube
tikhub-find-endpoint "user profile" --platform twitter
tikhub-find-endpoint "user posts" --platform twitter
```

中国大陆网络优先使用 `https://api.tikhub.dev`；其他地区可使用 `https://api.tikhub.io`。密钥只放在环境变量中。

## YouTube

至少收集：

- channel id、channel URL、title、description
- subscriber count、video count、公开链接
- 最近 10-20 条同格式视频的发布时间、播放、点赞、评论
- 相关主题视频和近期赞助视频

建议派生：

- `median_views_10_or_15`
- `median_engagement = median(likes + comments)`
- `view_to_subscriber_ratio`
- `posts_per_month`
- 相关内容占比
- 赞助内容表现相对自然内容的比例

长视频、Shorts、直播必须分开。不要让一个异常爆款拉高报价。

## X

至少收集：

- screen name、rest id、bio、location、followers、following
- 最近 30-50 条原创帖；转发与回复单独标记
- likes、replies、reposts、views（若可得）
- 相关主题帖、商业合作帖、置顶帖

建议派生：

- 原创帖 median impressions（若可得）
- median engagement
- engagement rate，分母需注明是 impressions 还是 followers
- posts per week
- 相关内容占比
- thread/video 的历史表现

X 的 views 经常缺失，缺失时不要用 followers 伪装成曝光。

## 公平比较

- 所有候选使用同一抓取日期。
- 尽量使用同一条数或同一时间窗。
- 若账号样本不足，记录实际样本量。
- 同一指标使用同一公式。
- 原始平台字段与派生指标分开存储。

## 地域证据

TikHub profile location 只能算一个信号。严格 base 还需要至少一个独立来源：

- 官网 About / contact / company registration
- 长期当地内容、当地活动演讲或公开采访
- 经纪公司/媒体资料中的所在地

受众地域通常需要 media kit 或 creator analytics 截图。拿不到时写 `未验证`。

## 成本与验证

- Profile 通常 1 call；每页内容 1 call。
- 研究前估算账号数 × 页面数，并设并发和分页上限。
- HTTP 200 不等于业务成功；检查 auth、余额、空数据和字段结构。
- 每个结果记录 endpoint、抓取时间、样本量和错误。
- 不要在最终文档中暗示 TikHub 提供了网页搜索或人工判断产生的字段。

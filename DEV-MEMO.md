# DEV-MEMO

「GitHub Issues / Discussions を CMS にした Astro ブログ」テンプレート兼教材（LP）の開発メモです。

このドキュメントの目的は、**設計判断と「なぜそうしたか」を後から追える形で残すこと**です。時系列の開発ログと、現状を反映した技術メモの両方を備えています。

---

## 1. 概要

- **目的**: GitHub Issues / Discussions を簡易 CMS として使い、GitHub Actions で Astro の静的ブログを生成し、GitHub Pages で公開する仕組みを提供する。
- **本リポジトリの役割**:
  1. **テンプレート**: 「Use this template」でコピーし、自分のブログ運用に使える一式。
  2. **教材（LP）**: トップページ（`index.astro`）と README が仕組みの解説を兼ねる。
- **対象読者**: テンプレート利用者（README 側）と本リポジトリの開発者（本メモ側）。

---

## 2. 技術メモ

### 2.1 確定済みの設計判断

| 項目 | 決定内容 |
|---|---|
| CMS ソース | **Issues 版 + Discussions 版の両対応**（workflow / スクリプトを分離） |
| 画像の扱い | **URL 直接方式**（ドラッグ&ドロップで貼ると GitHub が絶対 URL 化。ダウンロード処理なし） |
| v1 の機能 | **最小構成**（一覧 + 個別ページのみ。RSS / カテゴリ / プレビューは拡張候補） |
| デプロイ先 | **Project Site**（`https://{user}.github.io/issues-astro-cms/`）→ `base: "/issues-astro-cms/"` |
| 初期データ | **サンプル記事 5 件をコミット**（LP のデモ一覧表示用） |
| 言語 | 日本語（README / LP / サンプル記事） |

### 2.2 アーキテクチャ

```
[入力] GitHub Issues / Discussions   … 1 投稿 = 1 Issue/Discussion、YAML frontmatter + Markdown
   │                                 （ラベル status:published のものだけが公開対象）
[変換] GitHub Actions（Node.js）     … API で公開記事を取得 → src/content/posts/{slug}.md を再生成
[生成] Astro（Content Collections）  … 一覧（/）と個別（/posts/{slug}/）を静的生成
[公開] GitHub Pages                  … dist/ をデプロイ
```

「1 記事 = 1 Issue/Discussion」+「ラベルで公開状態を管理」+「公開ラベルのみビルド対象」という3点が設計の骨格です。

### 2.3 画像の扱い（設計の要点）

- Issue / Discussion の本文に画像をドラッグ&ドロップで貼ると、GitHub が自動で `https://user-images.githubusercontent.com/...` の絶対 URL に変換する。
- 生成スクリプトは画像に一切触れない（URL のまま埋め込む）。
- PLAN.md で検討されていた `attachment:` 参照の解決ロジック（timeline / comments 走査）は、**GitHub 仕様依存で脆弱なため採用しない**。この決定によりスクリプトが大幅に単純化された。
- 副次的な効果として、リポジトリ / 公開サイトのサイズも肥大化しにくい（GitHub Pages の 1 GB 制限との相性が良い）。

### 2.4 frontmatter スキーマ

| フィールド | 必須 | 備考 |
|---|---|---|
| `slug` | 必須（スクリプト側） | 出力ファイル名の元（例: `my-first-post` → `src/content/posts/my-first-post.md`）。**生成 Markdown には書き込まない** |
| `title` | 必須 | 記事タイトル |
| `publishedAt` | 必須 | `YYYY-MM-DD` |
| `tags` | 任意 | 配列 |
| `excerpt` | 任意 | 一覧表示用。無ければ本文から自動生成 |
| `category` | 任意 | Discussions 版で使用。デフォルト `blog` |
| `discussionId` | 任意 | Discussions 版で「GitHub でコメント」リンク用 |

### 2.5 Astro 5 の予約フィールドと日付の扱い（実装で躓いた点）

- Astro 5 の Content Collections では、frontmatter の **`slug` は予約フィールド**で `data` から除外される。スキーマに `slug` を定義するとエラーになる（実機で確認済み）。
- そのため `slug` は「スクリプトのファイル名の元」にのみ使い、**生成 Markdown の frontmatter には書かない**。
- ページ側は `p.id`（= ファイル名）から `.md` を除いて slug を導出する。
- `publishedAt` は YAML で `2026-08-01` と書くと `Date` に解釈される。スキーマ側は `z.union([z.string(), z.date()])` + transform で `YYYY-MM-DD` 文字列に正規化する。スクリプト側も Date を文字列化し、`matter.stringify` がクォート付きで書き出すため文字列のまま維持される。

### 2.6 変換スクリプト仕様

共通（`scripts/lib/common.mjs`）:

- `REPO`（owner/name）と `GITHUB_TOKEN` を env から取得
- `status:published` ラベルのみ対象
- 生成前に `src/content/posts/` をクリアして再生成
- `gray-matter` で frontmatter 解析。`slug` / `title` / `publishedAt` が無ければエラー
- `excerpt` が無ければ本文冒頭から自動生成

取得方式:

- Issues 版: REST Search API `repo:{repo} label:"status:published" is:issue`（PR は除外）
- Discussions 版: GraphQL `discussions(labels:["status:published"])`（cursor でページネーション）

### 2.7 パブリックテンプレート化の設計

- **ハードコードの除去**: `USERNAME` プレースホルダは `src/consts.ts` と `astro.config.mjs` の2箇所のみに集約。利用者はこの2ファイルの書き換えだけで運用開始できる。
- **GitHub 相対リンク**: README / SECURITY のリンクは `../../issues` などの相対パスにし、フォーク後の URL 変更を不要にした。
- **ラベル自動作成**: `labels.yml` が `status:draft` / `status:published` を push 時に冪等作成（`gh label create --force`、`issues: write` 権限が必要）。セットアップの手作業を減らした。

---

## 3. ディレクトリ構成（完全版）

```
/ (issues-astro-cms)
├── .github/
│   ├── ISSUE_TEMPLATE/blog-post.md         # Issues 用投稿フォーム
│   ├── ISSUE_TEMPLATE/config.yml           # テンプレート選択設定（空白 Issue 許可）
│   ├── DISCUSSION_TEMPLATE/blog-post.md    # Discussions 用投稿フォーム
│   ├── dependabot.yml                      # npm / github-actions の週次更新
│   └── workflows/
│       ├── build-issues.yml                # Issues → ビルド → Pages デプロイ
│       ├── build-discussions.yml           # Discussions → ビルド → Pages デプロイ
│       └── labels.yml                      # ラベル自動作成
├── scripts/
│   ├── lib/common.mjs                      # 共通処理（env, fetch, frontmatter 解析, 出力）
│   ├── build-from-issues.mjs               # REST Search API
│   └── build-from-discussions.mjs          # GraphQL API（ページネーション対応）
├── src/
│   ├── consts.ts                           # サイト設定の一元化（タイトル / リポジトリURL）
│   ├── content.config.ts                   # Content Collections schema
│   ├── content/posts/*.md                  # サンプル記事5件（Actions がここを再生成）
│   ├── layouts/Base.astro                  # 共通レイアウト
│   └── pages/
│       ├── index.astro                     # LP 兼 記事一覧
│       └── posts/[slug].astro              # 個別記事
├── public/assets/posts/.gitkeep            # 画像は外部 URL 参照のため空
├── astro.config.mjs                        # site / base 設定
├── package.json / package-lock.json
├── tsconfig.json
├── .gitignore
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── README.md                               # 教材本体
└── DEV-MEMO.md                             # 本メモ
```

---

## 4. セットアップ（要約）

1. リポジトリをコピー（Use this template）
2. `astro.config.mjs` の `site` を自分の Pages URL に変更
3. `src/consts.ts` の `GITHUB_REPO` を自分の `owner/name` に変更
4. Settings > Pages > Source を **GitHub Actions** に変更
5. ラベル `status:draft` / `status:published` は `labels.yml` が push 時に自動作成（手動でも可）
6. （Discussions 版を使う場合）Discussions を有効化 + カテゴリ `blog` を用意
7. `status:published` ラベルを付けた Issue / Discussion を作成 → Actions がビルド・デプロイ

---

## 5. 開発ログ

| 日付 | 内容 |
|---|---|
| 2026-07-31 | 企図の整理（PLAN.md）。Issues を CMS 化する方針と要件を確定 |
| 2026-08-01 | **初期実装**: Astro 一式・変換スクリプト・テンプレート・README を作成。`astro build` 検証 |
| 2026-08-01 | **パブリックテンプレート化**: LICENSE / SECURITY / CONTRIBUTING / CoC / labels.yml / dependabot / consts.ts を追加。YAML 検証 |
| 2026-08-03 | サンプル記事追加: 「なぜ GitHub Issues を CMS にするのか」（`why-issues-cms.md`） |
| 2026-08-04 | サンプル記事追加: 「GitHub Pages の利用制限・閾値まとめ」（`github-pages-limits.md`）。公式ドキュメントに基づき数値を確認 |

### サンプル記事一覧

| slug | 記事 | 公開日 |
|---|---|---|
| `getting-started` | セットアップ手順 | 2026-07-31 |
| `architecture` | アーキテクチャ解説 | 2026-08-01 |
| `issues-vs-discussions` | Issues 版と Discussions 版の使い分け | 2026-08-02 |
| `why-issues-cms` | なぜ Issues を CMS にするのか | 2026-08-03 |
| `github-pages-limits` | GitHub Pages の利用制限・閾値まとめ | 2026-08-04 |

---

## 6. 検証状況

### 検証済み（ローカル・現時点）

- `npm run build` 成功（6ページ: LP + 記事5件）
- 生成ルート: `/posts/{slug}/`（`base: /issues-astro-cms/` が適用され、リンクも base 付きで出力されることを確認）
- 変換スクリプト:
  - `node --check` で構文検証 OK
  - 一時リポジトリにコピーし `parsePost` → `writePost` → `astro build` を実行。生成 Markdown がそのままビルド可能なことを確認
  - `excerpt` 自動生成（本文冒頭 160 文字）も確認
- YAML 検証: 全 workflow / dependabot / ISSUE_TEMPLATE / DISCUSSION_TEMPLATE のパース OK
- 空 posts ディレクトリでのビルド: 失敗せず LP のみ生成（警告のみ。キャッシュ削除後のクリーン状態で確認）

### 検証済み（GitHub Actions 実動作）— 2026-08-01

- **Initialize Labels**: 成功。`status:draft` / `status:published` の自動作成を確認（`--repo` 指定が必要と判明）
- **Build Blog (Issues -> Astro)**: 成功（build + deploy 両ジョブ）
- **Build Blog (Discussions -> Astro)**: 成功（GraphQL の `labels` 引数除去 → クライアント側フィルタに修正して確認）
- Pages 公開: https://watanabe3tipapa.github.io/issues-astro-cms/ が HTTP 200 で配信
- 注意: 両ビルド workflow は同一 concurrency グループ `pages` を持つため、同時 push 時は片方がキャンセルされる（意図的な相互排他）。実際に使う workflow だけを有効化する
- 注意: 公開済み Issue/Discussion が 0 件の間は「デモ記事」一覧が空になる。サンプル記事はローカル用の初期データであり、CI では全消去→再生成されるため

---

## 7. 今後の課題・拡張候補

- RSS フィード生成
- カテゴリ / タグページ
- `status:draft` 用のプレビュー環境
- SEO / OGP の拡充（`metaTitle` / `metaDescription` / `ogImage`）
- 画像の最適化（WebP 変換など）が必要になった場合の設計

---

## 8. 検証方法

- ローカル: `npm run dev` / `npm run build`
- Actions: GitHub 側での実行が必要（ローカルでは `node --check` と YAML パースによる構文検証のみ）

# issues-astro-cms

**GitHub Issues / Discussions を CMS にした Astro ブログ**のテンプレート兼教材です。

GitHub の Issue や Discussion を「原稿」として書き、GitHub Actions が自動で Astro ブログを生成し、GitHub Pages で公開します。無料・自動化・GitHub 内完結のブログ CMS です。

- 入力: GitHub Issues / Discussions（1投稿 = 1 Issue/Discussion）
- 変換: GitHub Actions + Node.js（公開ラベルの記事だけを Markdown に変換）
- 生成: Astro（Content Collections）で一覧・個別ページを静的生成
- 公開: GitHub Pages（Project Site）

> [!TIP]
> **「Use this template」で自分のブログをすぐ始められます。** 手順は [セットアップ](#セットアップ) を参照してください。
>
> このリポジトリ自体はテンプレート・教材として公開しています。リポジトリ本体への改善提案は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

---

## 目次

1. [アーキテクチャ](#アーキテクチャ)
2. [ディレクトリ構成](#ディレクトリ構成)
3. [セットアップ](#セットアップ)
4. [記事の書き方](#記事の書き方)
5. [公開・非公開の切り替え](#公開非公開の切り替え)
6. [画像の扱い](#画像の扱い)
7. [Issues 版と Discussions 版](#issues-版と-discussions-版)
8. [カスタマイズ](#カスタマイズ)
9. [コントリビューション](#コントリビューション)
10. [ライセンス](#ライセンス)

---

## アーキテクチャ

3つの役割分担で考えます。

| 役割 | コンポーネント | やること |
|---|---|---|
| 原稿 | GitHub Issues / Discussions | 記事を書く場所（CMS の入力画面の代わり） |
| 工場 | GitHub Actions + Node.js | 公開ラベルの記事を API で取得し、Astro 用 Markdown を生成 |
| 店頭 | Astro + GitHub Pages | 一覧・個別ページを静的生成して公開 |

```
Issue / Discussion を書く
  → ラベル status:published を付ける
  → GitHub Actions が自動ビルド
  → GitHub Pages で公開
```

---

## ディレクトリ構成

```
/
├── .github/
│   ├── ISSUE_TEMPLATE/blog-post.md        # Issues 用の投稿フォーム
│   ├── DISCUSSION_TEMPLATE/blog-post.md   # Discussions 用の投稿フォーム
│   └── workflows/
│       ├── build-both.yml                  # 両対応: Issues + Discussions をまとめてビルド・デプロイ
│       ├── build-issues.yml                # Issues 版のビルド・デプロイ
│       ├── build-discussions.yml           # Discussions 版のビルド・デプロイ
│       └── labels.yml                     # status:published / status:draft ラベルを自動作成
├── scripts/
│   ├── lib/common.mjs                     # 共通処理（API / frontmatter解析 / 出力）
│   ├── build-from-both.mjs                # Issues + Discussions → Astro 用 Markdown
│   ├── build-from-issues.mjs              # Issues → Astro 用 Markdown
│   └── build-from-discussions.mjs         # Discussions → Astro 用 Markdown
├── src/
│   ├── consts.ts                          # サイト設定（タイトル / リポジトリURL）
│   ├── content.config.ts                  # Content Collections のスキーマ
│   ├── content/posts/*.md                 # 記事（Actions がここを再生成）
│   ├── layouts/Base.astro                 # 共通レイアウト
│   └── pages/
│       ├── index.astro                    # LP 兼 記事一覧
│       └── posts/[slug].astro             # 個別記事
├── public/assets/posts/                   # 画像は外部 URL 参照のため空
├── astro.config.mjs                       # site / base 設定
├── package.json
├── tsconfig.json
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
└── CODE_OF_CONDUCT.md
```

---

## セットアップ

### 1. リポジトリを作成する

1. このリポジトリを「**Use this template**」で自分のリポジトリとして作成します。
2. 自分の情報に合わせて次を変更します。
   - `astro.config.mjs` の `site` を自分の GitHub Pages URL に変更

```js
export default defineConfig({
  site: "https://username.github.io",
  base: "/issues-astro-cms/",
});
```

- `site`: 自分の Pages のドメイン（例: `https://username.github.io`）
- `base`: リポジトリ名（Project Site の場合。独自ドメインや `username.github.io` リポジトリの場合は空文字 `""` に変更）

3. `src/consts.ts` の `GITHUB_REPO` を自分のリポジトリ名（`owner/name`）に変更します（Discussions 版の「コメントする」リンクに使われます）。

### 2. GitHub Pages を有効にする

リポジトリの **Settings > Pages** で、Source を **GitHub Actions** に変更します。

### 3. ラベルを作成する

ラベルは `labels.yml` ワークフローが **main ブランチへの push 時に自動で作成**します。手動でも問題ありません。

| ラベル | 役割 |
|---|---|
| `status:draft` | 下書き（非公開） |
| `status:published` | 公開済み |

（手動作成する場合: Issues > Labels から上記2つを作成してください）

### 4. ローカルで試す（任意）

```bash
npm install
npm run dev        # 開発サーバー（http://localhost:4321）
npm run build      # 静的サイトを dist/ に生成
```

### 5. 公開する

`status:published` ラベルを付けた Issue（または Discussion）を作成すると、GitHub Actions が自動でビルドし、GitHub Pages に公開されます。

---

## 記事の書き方

### Issues の場合

**New Issue** から「Blog Post」テンプレートを選び、frontmatter と本文を編集して作成します。

```markdown
---
slug: my-first-post
title: My First Post
publishedAt: 2026-08-01
tags: [astro, github-pages]
excerpt: 一覧に表示する短い説明（任意）
---

# 記事タイトル

ここから本文を Markdown で書きます。
```

### Discussions の場合

Discussions の **blog** カテゴリで投稿します（`category: blog` を frontmatter に書きます）。

### frontmatter の項目

| フィールド | 必須 | 説明 |
|---|---|---|
| `slug` | 必須 | URL の一部（例: `my-first-post` → `/posts/my-first-post/`） |
| `title` | 必須 | 記事タイトル |
| `publishedAt` | 必須 | 公開日時。`YYYY-MM-DD` 形式 |
| `tags` | 任意 | 記事のタグ（配列） |
| `excerpt` | 任意 | 一覧用の短い説明。無ければ本文から自動生成 |
| `category` | 任意 | Discussions 版で使用。デフォルトは `blog` |

---

## 公開・非公開の切り替え

公開状態はラベルで管理します。`status:published` ラベルが付いた記事だけがサイトに表示されます。

- 公開: `status:published` を付ける（`status:draft` を外す）
- 下書きに戻す: `status:draft` を付ける（`status:published` を外す）

ラベルを変更すると GitHub Actions が再ビルドし、サイトに反映されます（最大15分間隔の定期ビルドも行っています）。

---

## 画像の扱い

Issue / Discussion の本文に画像を**ドラッグ&ドロップ**で貼ってください。GitHub が自動で絶対 URL に変換し、そのままサイトに表示されます。

```markdown
![スクリーンショット](https://user-images.githubusercontent.com/00000000/00000000-xxxx.png)
```

画像のダウンロード処理は実装していません。URL のまま使うことで、GitHub 仕様の変更に強いシンプルな構成にしています。

---

## Issues 版と Discussions 版

`.github/workflows/` にはビルドワークフローが3つあります。**使うモードに応じて1つだけ有効に**してください（複数有効にすると互いに競合します）。

| モード | ワークフロー | スクリプト | 特徴 |
|---|---|---|---|
| Issues 版 | `build-issues.yml` | `build-from-issues.mjs` | REST API。開発者向け・シンプル |
| Discussions 版 | `build-discussions.yml` | `build-from-discussions.mjs` | GraphQL API。カテゴリ / コメントを活用できる |
| **両対応** | `build-both.yml` | `build-from-both.mjs` | Issues + Discussions の両方から記事を集めて1サイトに表示 |

- **開発者中心の技術ブログ** → Issues 版がおすすめ
- **記事らしい見た目・コメント機能が欲しい** → Discussions 版がおすすめ
- **両方の入り口から書けるブログにしたい** → 両対応がおすすめ（このリポジトリのデモは両対応で動いています）

> **両対応を使う場合の注意**: 記事の `slug` は Issues / Discussions 間で**重複しない**ようにしてください（重複した場合、後から処理される Discussions 側はスキップされます）。また Discussions を使うにはリポジトリの **Settings > Features** で Discussions を有効化し、投稿用カテゴリを用意する必要があります。

Discussions 版・両対応で「GitHub でコメントする」リンクを使う場合、`src/consts.ts` の `GITHUB_REPO` を自分のリポジトリ名（`owner/name`）に変更してください。

---

## カスタマイズ

### サイトの設定（タイトル・リポジトリURL）

`src/consts.ts` にサイト設定を集約しています。タイトル・説明・リポジトリ URL をここで変更できます。

### テーマカラー

`src/layouts/Base.astro` の `:root` にある CSS 変数（`--bg` / `--ink` / `--yellow` / `--blue` など）で配色を変更できます。neo brutalism の枠線・影は `--border` と `--shadow` で調整します。

### 記事の並び順

`src/pages/index.astro` で `publishedAt` の降順ソートしています。

### 変換スクリプトのカスタマイズ

`scripts/lib/common.mjs` に共通処理を集約しています。frontmatter に独自フィールドを追加する場合は、ここと `src/content.config.ts` のスキーマを合わせて変更してください。

---

## 注意点

- GitHub Pages への反映には、Actions の実行完了まで数分かかります。
- `schedule`（15分ごと）は GitHub 側の状況により遅延することがあります。すぐ反映したい場合は `workflow_dispatch`（手動実行）か、ラベル変更・Issue 編集でトリガーされます。
- 検索 API / GraphQL API の仕様は GitHub 側で変更されることがあります。変更があれば `scripts/` を更新してください。

---

## コントリビューション

このリポジトリの改善へのご協力を歓迎します。

- バグ報告・機能提案: [Issue](../../issues) を作成してください
- コードの改善: [CONTRIBUTING.md](CONTRIBUTING.md) を参照し Pull Request を作成してください
- 脆弱性の報告: [SECURITY.md](SECURITY.md) を参照してください

---

## ライセンス

[MIT](LICENSE)

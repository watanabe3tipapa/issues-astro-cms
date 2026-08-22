# issues-astro-cms

GitHub Issues / Discussions を CMS として使う Astro ブログのテンプレート兼教材です。

GitHub の Issue や Discussion を「原稿」として書き、GitHub Actions が自動で Astro 用の Markdown を生成して、GitHub Pages で公開する構成を提供します。無料で自動化された、GitHub 内で完結するブログ CMS を目指しています。

主な特徴

- 入力: GitHub Issues / Discussions（1投稿 = 1 Issue/Discussion）
- 変換: GitHub Actions + Node.js（公開ラベルが付いた投稿のみを Markdown に変換）
- 生成: Astro（Content Collections）で一覧・個別ページを静的生成
- 公開: GitHub Pages（Project Site）

> TIP: 「Use this template」でこのリポジトリをコピーして、自分のブログをすぐに始められます。セットアップ手順は以下を参照してください。

---

## 目次

1. アーキテクチャ
2. ディレクトリ構成（主要ファイル）
3. セットアップ
4. 記事の書き方
5. 公開 / 非公開の切り替え
6. 画像の扱い
7. Issues 版 と Discussions 版
8. カスタマイズ
9. 注意点
10. コントリビューション
11. ライセンス

---

## アーキテクチャ

役割は大きく3つに分かれます。

- 原稿: GitHub Issues / Discussions — 記事を投稿する場所
- 工場: GitHub Actions + Node.js — API から投稿を取得し、Astro 用 Markdown を生成
- 店頭: Astro + GitHub Pages — 静的サイトを生成して公開

基本的な流れ

Issue / Discussion を書く → `status:published` ラベルを付ける → GitHub Actions が自動ビルド → GitHub Pages で公開

---

## ディレクトリ構成（主要ファイル）

リポジトリに含まれる主なファイル・フォルダを抜粋しています。

- .github/
  - ISSUE_TEMPLATE/blog-post.md
  - DISCUSSION_TEMPLATE/blog-post.md
  - workflows/
    - build-both.yml
    - build-issues.yml
    - build-discussions.yml
    - labels.yml
- scripts/
  - lib/common.mjs
  - build-from-both.mjs
  - build-from-issues.mjs
  - build-from-discussions.mjs
- src/
  - consts.ts
  - content.config.ts
  - content/posts/*.md (Actions が再生成)
  - layouts/Base.astro
  - pages/index.astro
  - pages/posts/[slug].astro
- public/assets/posts/ (画像は外部 URL を参照するため空)
- astro.config.mjs
- package.json
- LICENSE
- CONTRIBUTING.md
- SECURITY.md
- CODE_OF_CONDUCT.md

---

## セットアップ

1. このリポジトリを「Use this template」で自分のリポジトリとして作成します。
2. 必要に応じて設定ファイルを変更します。例: `astro.config.mjs` の site / base を自分の Pages 設定に合わせて変更します。

例: astro.config.mjs の設定例

```js
export default defineConfig({
  site: "https://username.github.io",
  base: "/issues-astro-cms/",
});
```

- `site`: GitHub Pages のドメイン（例: `https://username.github.io`）
- `base`: Project Site の場合はリポジトリ名。独自ドメインや `username.github.io` リポジトリでは空文字にします。

3. `src/consts.ts` の `GITHUB_REPO` など、サイト固有の設定を更新してください（Discussions 版での「コメントする」リンクに使用します）。
4. GitHub Pages を有効にする: リポジトリの Settings > Pages で Source を GitHub Actions に設定します。
5. ラベルを用意する: `labels.yml` ワークフローにより main ブランチへの push 時に自動作成されます。手動で作る場合は Issues > Labels で次の2つを作成してください。
   - `status:draft`（下書き）
   - `status:published`（公開済み）

ローカルでの動作確認（任意）

```bash
npm install
npm run dev        # 開発サーバー（デフォルト: http://localhost:4321）
npm run build      # 静的サイトを dist/ に生成
```

公開手順（概要）

- `status:published` ラベルが付いた Issue または Discussion を作成・更新すると、ワークフローが走りビルド・公開されます。

---

## 記事の書き方

### Issues の場合

New Issue から Blog Post テンプレートを使い、frontmatter と本文を入力します。

例:

```markdown
---
slug: my-first-post
title: My First Post
publishedAt: 2026-08-01
tags: [astro, github-pages]
excerpt: 一覧に表示する短い説明（任意）
---

# 記事タイトル

本文を Markdown で記述します。
```

### Discussions の場合

Discussions の投稿では `category: blog` を frontmatter に指定する運用例があります（Discussions を利用する場合はリポジトリ設定で Discussions を有効にしてください）。

frontmatter の主なフィールド

- slug (必須): 記事の URL 部分
- title (必須): 記事タイトル
- publishedAt (必須): 公開日（YYYY-MM-DD）
- tags (任意): 配列
- excerpt (任意): 一覧用の短い説明
- category (任意): Discussions 版で利用

---

## 公開・非公開の切り替え

公開状態はラベルで管理します。

- 公開: `status:published` を付与（`status:draft` を外す）
- 下書きに戻す: `status:draft` を付与（`status:published` を外す）

ラベル変更により GitHub Actions が再ビルドし、サイトに反映されます。

---

## 画像の扱い

Issue / Discussion の本文に画像をドラッグ&ドロップすると、GitHub が画像の絶対 URL を生成します。その URL を Markdown に記載したままサイトで表示します。画像はリポジトリ内にダウンロードせず、外部 URL を参照する設計です。

例:

```markdown
![スクリーンショット](https://user-images.githubusercontent.com/00000000/00000000-xxxx.png)
```

---

## Issues 版 と Discussions 版

ワークフローは3種類用意されています。使うモードに応じて1つだけ有効にしてください（複数有効だと競合します）。

- Issues 版: `build-issues.yml` + `build-from-issues.mjs`（REST API を利用）
- Discussions 版: `build-discussions.yml` + `build-from-discussions.mjs`（GraphQL API を利用）
- 両対応: `build-both.yml` + `build-from-both.mjs`（Issues と Discussions 両方を集約）

運用の目安

- 開発者中心の技術ブログ: Issues 版がシンプルでおすすめ
- 記事らしい見た目やコメントを重視: Discussions 版が適している場合あり
- 両方を受け付けたい: 両対応（ただし slug の重複に注意）

両対応を使用する場合、Issues と Discussions で同一の slug が重複しないようにしてください。重複があると後処理側の投稿がスキップされます。

---

## カスタマイズ

- サイト設定: `src/consts.ts` にタイトル・説明・リポジトリ URL 等の設定をまとめています。
- Content Collections のスキーマ: `src/content.config.ts` を参照してください。
- テーマカラー: `src/layouts/Base.astro` 内の CSS 変数（例: `--bg`, `--ink`, `--yellow`, `--blue`）で調整できます。
- 変換ロジック: `scripts/lib/common.mjs` に共通処理があります。frontmatter に独自フィールドを追加する場合は、ここと `src/content.config.ts` のスキーマを一致させてください。

---

## 注意点

- GitHub Actions の実行完了までに数分かかることがあります。
- 定期実行（schedule）や GitHub 側の API 仕様変更により挙動が変わることがあります。必要に応じて `scripts/` やワークフローを更新してください。

---

## コントリビューション

- バグ報告・機能提案: Issue を作成してください。
- コードの改善: `CONTRIBUTING.md` を参照して Pull Request を送ってください。
- 脆弱性報告: `SECURITY.md` を参照してください。

---

## ライセンス

このリポジトリは [MIT](LICENSE) ライセンスです。

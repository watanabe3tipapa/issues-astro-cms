---
title: Issues 版と Discussions 版の使い分け
publishedAt: 2026-08-02
tags: [issues, discussions, how-to]
excerpt: 同じテンプレートで Issues 版と Discussions 版の両方を選べます。それぞれの違いと、どちらを使うべきかの判断基準をまとめました。
---

このテンプレートは **Issues 版** と **Discussions 版** の両対応です。ビルドするワークフローとスクリプトが異なるだけで、サイトの見た目は共通です。

## 違いの一覧

| 項目 | Issues 版 | Discussions 版 |
|---|---|---|
| API | REST（Search API） | GraphQL |
| 公開制御 | ラベル `status:published` | ラベル `status:published` |
| カテゴリ | 任意（frontmatter に自分で書く） | Discussions のカテゴリ機能を利用 |
| コメント | なし | Discussions のコメントを活用可能 |
| UI | 開発者向け | ブログに近く非エンジニアにも扱いやすい |

## どちらを選ぶ？

- **開発者中心のチーム / 技術ブログ** → Issues 版がシンプルでおすすめ。
- **記事らしい見た目・コメント機能が欲しい** → Discussions 版がおすすめ。

## 両方のワークフロー

`.github/workflows/` に2つのワークフローがあります。

- `build-issues.yml` → `scripts/build-from-issues.mjs`
- `build-discussions.yml` → `scripts/build-from-discussions.mjs`

使う方だけ有効にすれば OK です。どちらも同じ `src/content/posts/` に Markdown を生成するため、Astro 側の変更は不要です。

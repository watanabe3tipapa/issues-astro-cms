---
title: アーキテクチャ解説（原稿・工場・店頭）
publishedAt: 2026-08-01
tags: [architecture, astro, github-actions]
excerpt: このブログは「GitHub Issues / Discussions = 原稿」「GitHub Actions = 工場」「GitHub Pages = 店頭」という3つの役割分担で動いています。
---

このブログの仕組みは、3つの役割分担で考えると分かりやすいです。

## 3つの役割

| 役割 | コンポーネント | やること |
|---|---|---|
| 原稿 | GitHub Issues / Discussions | 記事を書く場所（CMS の入力画面の代わり） |
| 工場 | GitHub Actions + Node.js | 公開ラベルの記事を集めて、Astro 用の Markdown を生成 |
| 店頭 | Astro + GitHub Pages | 一覧と個別ページを静的生成して公開 |

## 記事は「1記事 = 1 Issue/Discussion」

- 記事本文の先頭に YAML frontmatter（`slug` / `title` / `publishedAt` など）を書きます。
- 公開状態はラベル `status:published` で管理します。
- GitHub Actions のスクリプトが `status:published` のものだけを取得し、`src/content/posts/{slug}.md` を再生成します。

## 変換スクリプトの流れ

1. GitHub API で `status:published` ラベルの記事を取得（Issues は REST、Discussions は GraphQL）。
2. `gray-matter` で frontmatter と本文を解析。
3. `src/content/posts/` を一度クリアしてから、記事ごとの Markdown を書き出し。
4. `astro build` で一覧・個別ページを生成。

## 画像の扱い

Issue / Discussion の本文に画像をドラッグ&ドロップで貼ると、GitHub が絶対 URL に変換します。このテンプレートでは URL をそのまま使うため、画像のダウンロード処理は不要です。シンプルで壊れにくい設計です。

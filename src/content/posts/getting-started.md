---
title: セットアップ手順（3ステップで公開まで）
publishedAt: 2026-07-31
tags: [setup, github-pages, astro]
excerpt: このテンプレートを自分のリポジトリにコピーして、GitHub Issues / Discussions を CMS にしたブログを GitHub Pages で公開するまでの手順です。
---

このリポジトリは「GitHub Issues / Discussions を CMS にした Astro ブログ」のテンプレートです。以下の手順で、無料のブログ運用を始められます。

## 1. リポジトリの準備

1. 「Use this template」で自分のリポジトリを作成します。
2. `astro.config.mjs` の `site` を自分の GitHub Pages の URL に変更します（例: `https://username.github.io`）。
3. リポジトリの Settings > Pages で、Source を **GitHub Actions** に変更します。

## 2. ラベルを作成する

公開・下書きを制御するためのラベルを2つ作成します。

- `status:draft`
- `status:published`

`status:published` ラベルが付いた記事だけがサイトに公開されます。

## 3. 記事を投稿する

- **Issues 版**: New Issue から「Blog Post」テンプレートを選び、frontmatter と本文を書きます。
- **Discussions 版**: Discussions の `blog` カテゴリに投稿します。

投稿に `status:published` ラベルを付けると、GitHub Actions が自動でビルドし、GitHub Pages に公開されます。画像は本文にドラッグ&ドロップで貼るだけで OK です（GitHub が自動で URL 化します）。

## 公開のしくみ

```
Issue / Discussion を書く → ラベルで公開 → Actions がビルド → Pages で公開
```

下書きに戻したいときは `status:published` を外して `status:draft` を付けるだけです。ラベルが更新されるたびに Actions が再ビルドします。

---
name: Blog Post
about: 新しいブログ記事を作成します
title: "[Blog] 記事のタイトル"
labels: status:draft
assignees: ""
---

---
slug: my-first-post
title: My First Post
publishedAt: YYYY-MM-DD
tags: [astro, github-pages]
excerpt: 一覧に表示する短い説明（任意）
---

> **注意**: 値に `: `（コロン + スペース）を含む場合（例: `title: チュートリアル: 公開手順`）は、その値を二重引用符で囲んでください（例: `title: "チュートリアル: 公開手順"`）。囲まないと YAML の解析に失敗します。

# 記事タイトル

ここから本文を Markdown で書きます。

## 画像について

画像は本文にドラッグ&ドロップで貼ってください。GitHub が自動で URL に変換し、そのまま表示されます。

## 公開方法

この Issue を公開するには、右サイドバーのラベルに `status:published` を追加してください。

- 下書きのまま: `status:draft`
- 公開する: `status:published`（`status:draft` は外す）

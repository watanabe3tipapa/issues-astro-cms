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
| CMS ソース | **Issues 版 / Discussions 版 / 両対応** の3モード（結合ビルド `build-both` を追加し、両ソースの記事を1サイトに併載可能に） |
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
- Discussions 版: GraphQL `discussions` を全件取得 → `status:published` ラベルを JS 側でフィルタ（cursor でページネーション）
- **結合版（`build-from-both.mjs`）**: 上記2つの取得を1つのスクリプトに統合。**slug の重複は後処理（Discussions）側をスキップ**して対処。`cleanPostsDir()` を一度だけ呼び、両ソースの記事をまとめて書き出す

> 排他性の解消: 従来は「1 ソース = 1 ワークフロー」で、ビルドのたびに posts を全消去していたため両ソースの併載ができなかった（→ 空デプロイのインシデント、§6）。結合版は全消去 → 両ソース取得 → 一括書き出し とするため、同じサイトに Issues と Discussions の記事を同時に表示できる。

### 2.7 パブリックテンプレート化の設計

- **ハードコードの除去**: `USERNAME` プレースホルダは `src/consts.ts` と `astro.config.mjs` の2箇所のみに集約。利用者はこの2ファイルの書き換えだけで運用開始できる。
- **GitHub 相対リンク**: README / SECURITY のリンクは `../../issues` などの相対パスにし、フォーク後の URL 変更を不要にした。
- **ラベル自動作成**: `labels.yml` が `status:draft` / `status:published` を push 時に冪等作成（`gh label create --force`、`issues: write` 権限が必要）。セットアップの手作業を減らした。

### 2.8 UI / UX（neo brutalism 基調）

- テーマの方針は **neo brutalism**（太い黒枠・直角・ハードシャドウ・ビビッドなフラットカラー）で統一。従来のダーク系「柔らかい」テーマから全面刷新。
- デザイントークン（`Base.astro` の `:root`）:
  - `--bg: #f7f4ec`（クリーム）/ `--ink: #111111`（濃墨）/ `--paper: #ffffff`
  - `--yellow / --blue / --pink / --green / --purple` の5色をアクセントとしてローテーションで使用
  - `--border: #111`（3px）と `--shadow: 5px 5px 0 #111`（ハードシャドウ）が骨格
- 共通パターン: カード / バッジ / ボタンは「枠 + ハードシャドウ」で、hover 時に `translate` で押し込む動き（物理的なボタン感を演出）。
- 記事本文（Markdown）も同様に角丸を廃し、表は黄色ヘッダー、コード / 画像 / 引用は枠 + シャドウ。
- シンプルさを崩さないため、グリッドや配色の工夫はトークンと CSS 変数のみで完結（ライブラリ未導入）。

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
│       ├── build-both.yml                  # 両対応: Issues + Discussions をまとめてビルド・デプロイ
│       ├── build-issues.yml                # Issues 版（本リポジトリでは無効化済み）
│       ├── build-discussions.yml           # Discussions 版（本リポジトリでは無効化済み）
│       └── labels.yml                      # ラベル自動作成
├── scripts/
│   ├── lib/common.mjs                      # 共通処理（env, fetch, frontmatter 解析, 出力）
│   ├── build-from-both.mjs                 # Issues + Discussions の結合ビルド（本リポジトリで使用）
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
| 2026-08-01 | **GitHub Actions 実動作の検証**: 3 workflow すべて成功（ラベル自動作成・Issues ビルド・Discussions ビルド・Pages デプロイ） |
| 2026-08-01 | **デモ記事を公開**: サンプル記事を `status:published` 付き Issue（#7〜#12）として作成し公開。チュートリアル記事（`tutorial-first-post`）を追加 |
| 2026-08-01 | **UI/UX 刷新**: 全体を **neo brutalism 基調**にリスタイル（commit 44cf4e2） |
| 2026-08-01 | **main ブランチ保護**: ruleset `main protection`（PR 必須 + force push 拒否 + 削除拒否）を作成。詳細は §9 |
| 2026-08-01 | **空デプロイのインシデント対処**: Discussions workflow が空サイトを上書きしたため無効化し、Issues ビルドで記事を復旧 |
| 2026-08-01 | **両対応（結合ビルド）を導入**: `build-both.yml` / `build-from-both.mjs` を新設。Discussions を有効化し、サンプル Discussion 2件（#13 / #14）を作成。単独 workflow 2つは無効化し、Issues 6 + Discussions 2 の全8記事を1サイトで公開 |
| 2026-08-01 | `src/consts.ts` の `GITHUB_REPO` を本リポジトリの実値（`watanabe3tipapa/issues-astro-cms`）に設定。Discussions 記事の「コメントする」リンクが正しく生成されることを確認 |
| 2026-08-01 | **LP に Showcase セクションを追加**: 公開記事一覧を「Showcase（公開記事）」に刷新。各記事にソースバッジ（Issues=青 / Discussions=ピンク）を表示し、最新記事はフィーチャー（全幅）表示。両対応モードを視覚的にアピール |

### サンプル記事一覧

| slug | 記事 | 公開日 | ソース |
|---|---|---|---|
| `getting-started` | セットアップ手順 | 2026-07-31 | Issue #7 |
| `architecture` | アーキテクチャ解説 | 2026-08-01 | Issue #8 |
| `issues-vs-discussions` | Issues 版と Discussions 版の使い分け | 2026-08-02 | Issue #9 |
| `why-issues-cms` | なぜ Issues を CMS にするのか | 2026-08-03 | Issue #10 |
| `github-pages-limits` | GitHub Pages の利用制限・閾値まとめ | 2026-08-04 | Issue #11 |
| `tutorial-first-post` | チュートリアル: 最初の1記事を公開するまで | 2026-08-05 | Issue #12 |
| `discussions-howto` | Discussions 版の使い方 | 2026-08-06 | Discussion #13 |
| `readers-comments` | 読者のコメントを活用したブログ運用 | 2026-08-07 | Discussion #14 |

> 本リポジトリのデモ記事は、サンプル Issue（`status:published` 付き）およびサンプル Discussion（同）として GitHub 上に公開してある。結合ビルド（`build-both.mjs`）がこれらを元に `src/content/posts/` を再生成する。

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
- **インシデント（2026-08-01）**: push の競合で **Discussions ビルドが勝ち、「0 posts from Discussions」の空サイトを上書きデプロイ**し、公開中のデモ記事が全消去された。対処として **本リポジトリでは `build-discussions.yml` を無効化**（`gh workflow disable`）し、Issues ビルドを再実行して6記事を復旧。→ 教訓: **Discussions 版を使わないリポジトリでは必ず Discussions workflow を無効化しておく**（§9 の ruleset 導入後も同様）
- **結合ビルド（両対応）の検証**: `build-from-both.mjs` をローカル実行し Issues 6 + Discussions 2 = 8記事の生成を確認。`astro build` は 9 ページ（LP + 8記事）で成功。単独 workflow（build-issues / build-discussions）は無効化し、`build-both.yml` に一本化
- 注意: 公開済み Issue/Discussion が 0 件の間は「デモ記事」一覧が空になる。サンプル記事はローカル用の初期データであり、CI では全消去→再生成されるため
- 実地発見の落とし穴: frontmatter の値に `: `（コロン+スペース）を含むと YAML パースに失敗（例: `title: チュートリアル: 公開手順`）。ISSUE_TEMPLATE に「二重引用符で囲む」旨を追記済み
- **デモ記事の公開確認**: `status:published` 付き Issue（#7〜#12）から全6記事が生成され、https://watanabe3tipapa.github.io/issues-astro-cms/ で公開中（個別ページ含め HTTP 200）
- **UI 検証**: neo brutalism 刷新後も `npm run build` 成功（6ページ）→ push でデプロイまで確認済み

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

---

## 9. トピック: main ブランチの保護（branch protection ruleset）

> パブリックテンプレート化を進める中で GitHub から「Your main branch isn't protected」のバナーが出た。この判断は本リポジトリの運用方針に直結するため、トピックとして詳細を残す。

### 9.1 背景と判断の流れ

- 現状、リポジトリは「パブリック + テンプレート」であり、`CONTRIBUTING.md` が**フォーク → feature ブランチ → PR** の貢献フローを明記している。
- GitHub が main の無保護を通知（`Your main branch isn't protected`）。この時点で**有効化する**と判断した。
- 理由は以下の通り。
  1. ガバナンスとの整合: CONTRIBUTING.md が PR フロー前提なのに、main が誰でも push できるのは矛盾している。
  2. デプロイとの非依存: 本テンプレートの公開フローは「Issue / Discussion → GitHub Actions → Pages」であり、**main への直接 push には依存していない**。したがって保護を導入しても運用は壊れない。
  3. 誤操作の防止: 公開テンプレートでは force push やブランチ削除による事故が最も怖い。これをルールで止められる。

### 9.2 実施した設定（2026-08-01）

リポジトリルールセット（branch ruleset）を作成した。

| 項目 | 値 |
|---|---|
| 名前 | `main protection` |
| 対象 | branch（`refs/heads/main` を include） |
| enforcement | `active` |
| ルール | `pull_request` / `non_fast_forward` / `deletion` |
| bypass | RepositoryRole: admin（`bypass_mode: always`） |

- `pull_request`: **マージに PR を必須化**。`required_approving_review_count: 0`（solo 運用のためレビュー人数は要求しない）
- `non_fast_forward`: **force push を拒否**（`--force` や rebase push による履歴書き換えを禁止）
- `deletion`: **ブランチの削除を拒否**
- `bypass_actors`: **RepositoryRole admin（actor_id: 2）** を `always` で bypass。これが無いと**オーナー自身の直接 push もブロックされる**（実測で確認）

作成コマンド（再現用）:

```bash
gh api --method POST repos/watanabe3tipapa/issues-astro-cms/rulesets \
  --input /path/to/ruleset-main.json

# bypass 追加（※ PATCH は 404 を返したため PUT で更新した）
gh api --method PUT repos/watanabe3tipapa/issues-astro-cms/rulesets/20182162 \
  --input /path/to/ruleset-bypass.json
```

作成時ボディ:

```json
{
  "name": "main protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ]
}
```

bypass 追加時のボディ:

```json
{
  "bypass_actors": [
    { "actor_id": 2, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ]
}
```

### 9.2.1 実測で判明した注意点

- **API で ruleset を作成しただけでは owner も直接 push できない。** `pull_request` ルールは bypass_actors の指定が無い限り**リポジトリオーナーにも適用**される。実際、作成直後の push が `push declined due to repository rule violations` で拒否された。
- admin bypass（`actor_id: 2`）を `bypass_mode: always` で追加したところ、owner の直接 push は `Bypassed rule violations` として通り、外部からの PR フローはそのまま維持される。
- **更新 API は `PATCH` ではなく `PUT` を使う必要があった。** `PATCH` は存在する ruleset に対しても 404 を返した（gh api / curl どちらも）。`PUT` なら成功する。

### 9.3 あえて「status checks」を入れなかった理由（重要）

`Require status checks to pass before merging` を追加しなかったのは、以下の理由による。

- **fork からの PR では `deploy` ジョブが必ず失敗する。** fork の workflow は `pages: write` / `id-token: write` を持てないため、`actions/deploy-pages` が失敗する。Build Blog workflow を required status check にすると、**外部コントリビューションが永遠にマージできなくなる**。
- 仮に入れるなら **`build` ジョブのみ**を対象にする（`deploy` ジョブを除外）。ただしジョブ単位の required check は運用が煩雑になりがちで、現時点では過剰。
- そもそも required status check は **PR マージ時にのみ**効き、**直接 push を止めるものではない**。直接 push の抑止を狙うなら `pull_request` ルールこそが実効的な手段であり、それは導入済み。

### 9.4 影響と運用上の注意

- **リポジトリオーナーは admin bypass**（`bypass_actors` で明示設定）で引き続き main へ直接 push できる。既存の自分運用（main 直 push）は変わらない。※ bypass 未設定だと owner もブロックされる（§9.2.1）
- 外部コントリビューターは **PR 経由のみ** で main に変更が入る。
- `labels.yml`（Issue ラベル操作）と `dependabot.yml`（**PR を作成する**のでむしろ整合）は影響なし。
- ブランチ名は `main`（git init -b main で初期化済み）。ruleset の include も `refs/heads/main` で固定している。

### 9.5 将来の拡張候補

- 必要になったら `build` ジョブのみを対象にした required status check を追加（その際は deploy ジョブ除外の理由を忘れない）
- Code owners レビュー / マージ前の会話解決（conversation resolution）の要求
- タグや release ブランチの保護、`workflow` パーミッションの制限強化
- このテンプレートを利用する側への指針として、README に「推奨 branch protection 設定」を追記する余地がある

---

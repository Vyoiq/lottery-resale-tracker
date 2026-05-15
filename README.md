# 公開抽選販売・買取価格情報アプリ

ログイン不要で閲覧できる公開ページやRSSから、抽選販売情報と買取価格候補を取得し、利益・ROI・応募優先度・応募履歴・売却履歴を管理する個人用アプリです。

自動応募、ログイン自動化、CAPTCHA回避、複数アカウント作成、購入処理、不正アクセス、高頻度アクセスは実装しません。対象は公開ページのみです。

## 現在の主な機能

v0.3.0 以降では、次の機能を実装しています。

- 公開ページまたはRSSからの抽選販売情報収集
- 監視ソース管理とプリセット追加
- 抽選情報の自動検出、重複更新、収集ログ記録
- URL単体の dry-run 検出テスト
- 公開価格ページからの買取価格候補取得
- 商品名揺れ対策用の検索キーワード生成
- 価格候補の confidenceScore 表示
- 価格取得 dry-run テスト
- 定価、最高買取価格、想定利益、利益率、ROI、倍率の表示
- 応募優先度スコアと S/A/B/C/D ラベル表示
- 誤検出レビューとユーザー判定フィードバック
- 除外キーワード管理
- 応募、当選、落選、購入、売却、スキップの手動記録
- 実利益、実利益率、実ROIの自動計算
- アプリ内通知の生成、未読管理、重要通知の確認
- SQLite DB の手動バックアップ、一覧、ダウンロード、削除
- JSONエクスポート、抽選一覧CSV、価格履歴CSV、応募・売却履歴CSV
- 運用設定、一括実行、運用実行ログ
- Windows タスクスケジューラ向け `.bat` / `.ps1` 実行スクリプト
- ダッシュボードでの応募候補、価格未取得、確定利益、当選率の確認
- 分析ページでの月別利益、商品別利益、店舗別当選率の確認
- 売却履歴CSVエクスポート

## v1.0.0 到達時点の機能一覧

v1.0.0 では、ローカルPCで個人運用するための安定版として以下を備えています。

- 公開ページ/RSSからの抽選販売情報収集
- 公開価格ページからの買取価格候補取得
- 利益、利益率、ROI、倍率、応募優先度スコアの表示
- 誤検出レビュー、除外キーワード、ユーザー判定フィードバック
- 応募、当選、落選、購入、売却、スキップの手動記録
- 実利益、実利益率、実ROIの集計
- アプリ内通知と既読管理
- SQLite DB のバックアップ、ダウンロード、削除、復元
- JSON/CSV エクスポート
- 運用設定、一括実行、運用実行ログ
- Windows タスクスケジューラ用の `.bat` / `.ps1`
- 初回セットアップガイドとヘルスチェック

## 今後の開発予定

今後は、実運用での検出精度と使いやすさを高める方向で改善します。

- 監視ソースごとのアクセス間隔、robots.txt、利用規約確認メモの強化
- CollectorRun と PriceCollectorRun の詳細ログ改善
- 価格候補の除外理由、採用理由、タイトル類似度の可視化強化
- 商品名正規化と日付抽出ロジックの改善
- 価格取得元ごとの専用 collector 追加
- 外部通知、メール通知、Discord通知などの追加
- 応募・購入・売却履歴の編集、取り消し、監査ログ追加
- 送料・手数料のデフォルト設定
- PostgreSQL 移行を見据えた設定整理
- Vercel デプロイ手順と本番運用設定の追加
- CSVインポート、バックアップ復元機能

## 起動方法

初回は依存関係のインストール、SQLite DB の作成、サンプルデータ投入、開発サーバー起動の順に実行します。

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

起動後は `http://localhost:3000` を開きます。`.env` が必要な場合はプロジェクト直下に置き、`DATABASE_URL="file:./dev.db"` のように SQLite を指す設定にしてください。

## 初回セットアップ手順

画面で確認する場合は `/getting-started` を開いてください。

1. `/sources/presets` で監視ソース候補を追加する
2. `/sources` でURLと利用規約を確認し、使うものだけ `enabled` にする
3. `/price-sources/presets` で価格ソース候補を追加する
4. `/price-sources` で `searchUrlTemplate` を確認し、使うものだけ `enabled` にする
5. `/collector-test` と `/price-checker` で dry-run 確認する
6. `npm run operate` またはダッシュボードの一括実行を実行する
7. `/backups` でバックアップを作成する
8. 必要に応じて Windows タスクスケジューラに `scripts/windows/operate.bat` と `scripts/windows/backup.bat` を登録する
9. `/health` でDB、ソース、バックアップ、ログディレクトリの状態を確認する

## 最初にやることチェックリスト

- `/sources/presets` で監視ソース候補を追加する
- `/sources` でURL、メモ、利用規約、公開ページであることを確認してから有効化する
- `/collector-test` で気になるURLを dry-run し、キーワードや日付抽出を確認する
- `/price-sources/presets` で価格ソース候補を追加する
- `/price-sources` で `searchUrlTemplate` と公開ページであることを確認してから有効化する
- `/price-checker` で商品名を dry-run し、価格候補と confidenceScore を確認する
- `/settings/operations` で収集、価格取得、通知、バックアップの設定を確認する
- `/backups` で初回バックアップを作成する
- ダッシュボードの「運用タスクをまとめて実行」で一連の処理を確認する
- `/operation-runs` で成功/失敗、エラー詳細、確認ポイントを見る

プリセットは追加しても自動では有効化されません。実際に巡回する前に、URLが正しいこと、ログイン不要であること、利用規約やアクセス頻度の方針に反しないことを確認してください。

## よく使うコマンド一覧

```bash
npm run dev
npm run build
npm run collect
npm run collect -- --dry-run
npm run collect:prices
npm run collect:prices -- --dry-run
npm run notifications
npm run discover:sources
npm run cleanup:placeholders
npm run backup
npm run operate
npx prisma migrate dev
npx prisma db seed
```

## 失敗時の確認方法

画面の実行ボタンから `collect`、`collect:prices`、`notifications`、`backup`、`operate` を実行した場合、結果は `/operation-runs` に残ります。

失敗または一部失敗の場合は、ログのメッセージ欄に確認ポイントと詳細を表示します。まず以下を確認してください。

- 監視ソースまたは価格ソースが有効になっているか
- 対象URLがログイン不要の公開ページとしてブラウザで開けるか
- `.env` の `DATABASE_URL` が正しいか
- ネットワーク接続、アクセス頻度、サイト側の一時エラーがないか
- `backups/` に書き込みできるか

## 困ったときの確認順

1. `/health` でDB接続、ソース件数、最終実行日時、ディレクトリ有無を確認する
2. `/operation-runs` で一括実行や個別実行のエラー詳細を見る
3. `/runs` と `/runs/[id]` で抽選情報収集のソース別結果を見る
4. `/sources` と `/price-sources` で対象ソースが `enabled` になっているか確認する
5. `/collector-test` と `/price-checker` で dry-run し、URL取得、キーワード、日付、価格候補を確認する
6. `backups/` と `/backups` でバックアップが作られているか確認する
7. Windows タスクスケジューラ運用の場合は `logs/` の `.log` を確認する

## Gitタグ運用メモ

安定版の節目では `main` にマージ後、セマンティックバージョンのタグを付けます。

```bash
git tag v1.1.0
git push origin v1.1.0
```

小さな修正は patch、日常運用の改善は minor、DB設計や運用手順が大きく変わる場合は major として扱います。

## 抽選情報の収集

```bash
npm run collect
npm run collect -- --dry-run
```

監視ソースは `/sources` で追加・有効化します。`/sources/presets` のプリセットは初期状態では無効です。ユーザーが明示的に有効化したものだけ巡回します。

`/collector-test` では、監視ソースに登録せずに1つのURLを dry-run で検出確認できます。

## 買取価格の自動取得

```bash
npm run collect:prices
npm run collect:prices -- --dry-run
```

価格取得元は `/price-sources` で登録します。`searchUrlTemplate` には `{keyword}` を含めます。

```txt
https://example.com/search?q={keyword}
```

`/price-checker` ではDB保存なしで、生成された検索キーワード、検索URL、採用候補、除外候補、confidenceScore を確認できます。

## 価格ソースプリセットと有効化

`/price-sources/presets` の「追加済み」は、プリセットが `PriceSource` にコピー済みという意味です。価格取得に使われる状態、つまり `enabled: true` とは別です。

価格ソースを実際に使うには、`/price-sources` でURLを確認してから有効化してください。

注意:
- プリセット追加 = 有効化ではありません。
- 有効化は `/price-sources` で行います。
- `example.com` を含むURLはプレースホルダーです。
- プレースホルダーURLは実在する公開検索URLへ差し替えてから使ってください。
- `example.com` の価格ソースは安全のため有効化できないようにしています。

## ソース自動発見

`/source-discovery` では、公開RSSや既存の公開ページから、抽選情報ページや買取価格検索ページの候補URLを探せます。

できること:
- `DiscoveryQuery` に検索キーワードを登録する
- `npm run discover:sources` または画面の「ソース候補を探す」で候補を取得する
- 発見候補を WatchSource または PriceSource に追加する
- 不要な候補を無視する

安全仕様:
- Google検索結果ページの直接スクレイピングは行いません。
- 公開RSS、許可された検索API、公開ページからのリンク抽出を対象にします。
- `example.com` を含むURLはプレースホルダーとして除外します。
- WatchSource / PriceSource に追加しても、必ず `enabled: false` です。
- 実際に巡回する前に `/sources` または `/price-sources` でURL、利用規約、ログイン不要で閲覧できること、アクセス頻度を確認してください。
- 自動応募、自動購入、ログイン自動化、CAPTCHA回避は実装していません。

## プレースホルダーURLの扱い

`example.com`、`placeholder`、`サンプル`、`プレースホルダー`、`要差し替え`、`要確認` を含む WatchSource / PriceSource はプレースホルダーとして扱います。

- プレースホルダーURLは `npm run collect`、`npm run collect:prices`、`npm run operate` でHTTPアクセスしません。
- 実行時に見つかったプレースホルダーはスキップし、ログに「プレースホルダーのためスキップ」と理由を残します。
- `/sources` と `/price-sources` では、プレースホルダーを `enabled: true` にできません。
- 既に有効になっているプレースホルダーは `npm run cleanup:placeholders` で `enabled: false` に戻せます。
- `/health` では、プレースホルダー件数と、有効化された危険なプレースホルダー件数を確認できます。

実際に使うURLだけ、人間が公開ページ・利用規約・アクセス頻度を確認してから `/sources` または `/price-sources` で `enabled: true` にしてください。

普段の応募判断は `/simple` を見る運用を推奨します。`/simple` はポケモンカード系、受付中、利益あり、価格取得済み、未無視、S/A/B優先で並べ、Snow Man、Blu-ray、DVD、CD、アナログレコード、ファイナルファンタジー、ゴールドポイント、ゲームソフト、映像作品、音楽作品などのノイズを下げます。

半自動モードは `/settings/operations` の「ソース自動発見モード」で選べます。

- 候補発見のみ
- WatchSource / PriceSource に自動追加するが `enabled: false`
- 高信頼候補だけ自動追加するが `enabled: false`

## 応募状況の記録

`/lotteries/[id]` の「応募状況」から、ユーザーが手動で行った行動を記録します。

- 応募した
- 当選した
- 落選した
- 購入した
- 売却した
- スキップした

これは記録機能だけです。自動応募、自動購入、自動売却は行いません。

## 購入記録

`/lotteries/[id]` の「購入記録」で購入価格と購入メモを入力し、「購入した」を押します。

保存される主な項目:
- `applicationStatus = purchased`
- `purchasedAt`
- `purchasePrice`
- `purchaseMemo`

## 売却記録

`/lotteries/[id]` の「売却記録」で以下を入力します。

- 購入価格
- 売却価格
- 送料
- 手数料
- 売却先
- 売却メモ

売却登録後、`applicationStatus = sold` になり、実利益・実利益率・実ROIを自動計算します。

## 実利益の計算式

```txt
実利益 = 売却価格 - 購入価格 - 送料 - 手数料
実利益率 = 実利益 / 売却価格 * 100
実ROI = 実利益 / 購入価格 * 100
```

実利益率と実ROIは小数点1桁で表示します。

## バックアップ

`/backups` またはダッシュボードの「バックアップ作成」から、現在の SQLite DB を `backups/` にコピーできます。

バックアップファイル名には日時が入ります。

```txt
backups/backup-YYYY-MM-DD-HHmmss.db
```

バックアップ一覧では、ファイル名、作成日時、サイズ、メモを確認できます。各バックアップは画面からダウンロードまたは削除できます。

API:
- `POST /api/backups/create`
- `GET /api/backups`
- `GET /api/backups/[id]/download`
- `DELETE /api/backups/[id]`
- `POST /api/backups/[id]/restore`

## バックアップからの復元

`/backups` の「復元」ボタンから、BackupRecord に登録済みのバックアップDBを現在の SQLite DB に復元できます。

復元は現在のDBを上書きする危険な操作です。実行前に確認ダイアログで、復元対象のファイル名、作成日時、サイズを表示します。

安全仕様:
- 復元前に現在のDBを `pre-restore-backup-YYYYMMDD-HHmmss.db` として自動バックアップします。
- 復元対象は BackupRecord に登録済みのものだけです。
- `backups/` 配下の `.db` ファイルだけを復元対象にします。
- `backups/` 外の任意パスや path traversal は拒否します。
- 復元結果は `/operation-runs` に `バックアップ復元` として記録します。

Windowsでは、Next.js dev server や Prisma Client が SQLite DB ファイルを掴んでいる場合、復元に失敗することがあります。その場合は `npm run dev` を停止し、必要なら Node.js プロセスが残っていないことを確認してから再実行してください。

復元後は、起動中のアプリが古い Prisma 接続を保持している可能性があります。表示や操作に違和感がある場合は dev server を再起動してください。

## JSONエクスポート

主要データを JSON で出力できます。`BackupRecord` は JSON エクスポート対象外です。

```txt
GET /api/export/json
```

出力対象:
- `WatchSource`
- `LotteryListing`
- `PriceSource`
- `PriceRecord`
- `Notification`

ファイル名は `lottery-resale-tracker-export-YYYYMMDD-HHmmss.json` です。

## CSVエクスポート

以下のCSVを出力できます。

- 抽選一覧CSV: `GET /api/export/lotteries`
- 価格履歴CSV: `GET /api/export/prices`
- 応募・売却履歴CSV: `GET /api/export/sales`

## 売却履歴CSV

`/analytics` の「売却履歴CSV」からCSVを出力できます。

出力項目:
- 商品名
- 店舗名
- 応募日
- 当選日
- 購入日
- 売却日
- 購入価格
- 売却価格
- 送料
- 手数料
- 実利益
- 実利益率
- 実ROI
- メモ

直接開く場合は `/api/export/sales` です。現在は応募・購入・売却履歴をまとめて出力します。

## アプリ内通知

抽選情報、価格情報、応募状況から見逃したくない候補を通知として作成します。

通知生成:

```bash
npm run notifications
```

画面から実行する場合は、ダッシュボードまたは `/notifications` の「通知を更新」を押します。API から実行する場合は `POST /api/notifications/generate` です。

通知条件:
- 応募優先度 `S` の候補
- 応募優先度 `A` 以上で締切3日以内
- 想定利益 3,000円以上、または ROI 100%以上
- 価格取得エラー
- 締切当日なのに未応募
- 当選済みだが購入未記録
- 購入済みだが売却未記録

同じ抽選と同じ通知種別の未読通知がある場合は重複作成しません。内容が変わった場合は既存の未読通知を更新します。

既読管理:
- `/notifications` で個別に既読化できます。
- 「全て既読にする」で未読通知をまとめて既読にできます。
- 未読のみ、重要度別で絞り込みできます。

## 運用設定と一括実行

`/settings/operations` でローカル運用向けの設定を管理できます。

設定項目:
- 抽選情報収集を有効化するか
- 価格取得を有効化するか
- 通知生成を有効化するか
- 自動バックアップを有効化するか
- 抽選情報収集の実行間隔
- 価格取得の実行間隔
- バックアップ保持件数
- 最低ROI通知しきい値
- 最低利益通知しきい値

ダッシュボードまたは `/settings/operations` の「運用タスクをまとめて実行」を押すと、設定に従って以下を順番に実行します。

1. 抽選情報収集
2. 価格取得
3. 通知生成
4. 自動バックアップが有効な場合のみバックアップ作成

実行結果は `OperationRun` に保存され、`/operation-runs` または `/settings/operations` で確認できます。

CLI から一括実行する場合:

```bash
npm run operate
```

バックアップだけを作成する場合:

```bash
npm run backup
```

Windows タスクスケジューラで定期実行する場合は、タスクの開始場所をこのプロジェクトディレクトリにし、実行コマンドを `npm run operate` にします。タスクスケジューラ自体の登録はこのアプリでは行いません。アクセス頻度を抑えるため、監視ソースを必要最小限にし、実行間隔は十分に長く設定してください。

## Windows タスクスケジューラでの定期実行

Windows で定期実行しやすいように、`scripts/windows/` に実行スクリプトを用意しています。

用意している `.bat`:
- `scripts/windows/operate.bat`
- `scripts/windows/backup.bat`
- `scripts/windows/collect.bat`
- `scripts/windows/collect-prices.bat`
- `scripts/windows/notifications.bat`

PowerShell版:
- `scripts/windows/operate.ps1`
- `scripts/windows/backup.ps1`

各スクリプトは `C:\Users\cocac\Lottery Resale Tracker` に移動してから npm script を実行し、結果を `logs/` に保存します。

ログ:
- `logs/operate.log`
- `logs/backup.log`
- `logs/collect.log`
- `logs/collect-prices.log`
- `logs/notifications.log`

初回確認:
1. Node.js がインストール済みであることを確認します。
2. 必要な `.env` をプロジェクト直下に置きます。
3. まず `scripts/windows/operate.bat` や `scripts/windows/backup.bat` をダブルクリックして手動確認します。
4. 失敗した場合は `logs/` の該当ログを確認します。

タスクスケジューラの開き方:
1. Windows のスタートメニューで「タスク スケジューラ」を検索して開きます。
2. 右側の「基本タスクの作成」を選びます。
3. 名前を入力します。例: `Lottery Resale Tracker Operate`
4. トリガーで「毎日」を選びます。
5. 操作で「プログラムの開始」を選びます。

毎日朝8時に `operate.bat` を実行する例:
- プログラム/スクリプト: `C:\Users\cocac\Lottery Resale Tracker\scripts\windows\operate.bat`
- 開始（オプション）: `C:\Users\cocac\Lottery Resale Tracker`
- トリガー: 毎日 8:00

毎日夜23時に `backup.bat` を実行する例:
- プログラム/スクリプト: `C:\Users\cocac\Lottery Resale Tracker\scripts\windows\backup.bat`
- 開始（オプション）: `C:\Users\cocac\Lottery Resale Tracker`
- トリガー: 毎日 23:00

失敗した場合の確認ポイント:
- `logs/` のログに `failed` や `exitCode` が出ていないか確認します。
- `npm install` が完了しているか確認します。
- `.env` がプロジェクト直下にあり、`DATABASE_URL` が正しいか確認します。
- PCがスリープしていると実行されない可能性があります。
- タスクの「開始（オプション）」がプロジェクトディレクトリになっているか確認します。
- 実行ユーザーがプロジェクトフォルダ、`logs/`、`backups/` に書き込めるか確認します。

`logs/` と `backups/` はGit管理対象外です。スクリプト本体の `scripts/windows/*.bat` と `scripts/windows/*.ps1` はGit管理対象です。

## 応募優先度スコア

`LotteryListing` ごとに 0-100 の応募優先度スコアを計算します。

加点要素:
- 想定利益が高い
- ROI が高い
- 価格 confidenceScore が高い
- 応募締切が近い
- 買取価格が取得済み
- 定価が入力済み
- ステータスが active

減点要素:
- 価格が未取得、取得エラー、または要確認価格
- 応募締切が過ぎている
- 定価が不明
- confidenceScore が低い
- 商品名が短い、または曖昧
- 除外キーワードに一致

ラベル:
- `S`: 最優先
- `A`: 応募推奨
- `B`: 要確認
- `C`: 低優先
- `D`: 対象外

Sランク候補は `/review` の「Sランク候補」と、ダッシュボードの応募候補で確認します。応募前に元ページ、商品名、価格候補、締切を必ず確認してください。

## 実運用検証モード

誤検出やスコアの妥当性を確認するため、抽選ごとにユーザー判定を残せます。

判定:
- 良い候補
- 価格が違う
- 商品が違う
- 興味なし
- 期限切れ
- 重複
- その他

`/lotteries` と `/lotteries/[id]` と `/review` で判定ボタンを押すと、`userVerdict`、`userVerdictMemo`、`userVerdictAt` が保存されます。

## 分析

`/analytics` では以下を確認できます。

- 月別確定利益
- 商品別利益ランキング
- 店舗別当選率
- 応募数
- 当選数
- 売却数
- 平均利益
- 平均ROI

## 除外キーワード

`/settings/exclusions` で除外キーワードを管理できます。

例:
- オリパ
- くじ
- 中古
- 傷あり
- 開封済み
- 販売価格のみ
- 在庫なし

一致した抽選は自動削除せず、応募優先度を `D` に下げます。個別の抽選は `/lotteries` または `/lotteries/[id]` で無視・無視解除できます。

## 高信頼価格と要確認価格

最高買取価格の元になった `PriceRecord.confidenceScore` で表示を分けます。

- 高信頼価格: confidenceScore が 0.70 以上
- 要確認価格: confidenceScore が 0.70 未満

要確認価格は利益ランキング上では注意して扱い、応募前に `/price-checker` または抽選詳細の価格履歴で確認してください。

## 想定利益の計算式

```txt
差益 = 最高買取価格 - 定価 - 送料 - 手数料
売上ベース利益率 = 差益 / 最高買取価格 * 100
ROI = 差益 / 定価 * 100
倍率 = 最高買取価格 / 定価
```

現在のMVPでは想定利益の送料・手数料は0円として計算します。

## 画面

- `/` ダッシュボード
- `/simple` シンプルモード。応募判断に必要な商品名、店舗名、締切、定価、最高買取価格、想定利益、利益率、ROI、倍率、応募優先度、元ページURL、価格信頼度だけを1画面で確認
- `/source-discovery` 公開RSSや公開ページから監視ソース候補・価格ソース候補を自動発見
- `/notifications` アプリ内通知、既読管理
- `/backups` バックアップ作成、一覧、ダウンロード、削除、JSON/CSVエクスポート
- `/lotteries` 抽選一覧、利益表示、応募状況、実利益、判定フィードバック、無視操作
- `/lotteries/[id]` 抽選詳細、応募・購入・売却記録、価格チェック、価格履歴、手入力補正
- `/analytics` 分析、売却履歴CSV
- `/review` 誤検出レビュー
- `/settings/score-tuning` スコア調整用の集計
- `/settings/exclusions` 除外キーワード
- `/settings/operations` 運用設定、一括実行、個別実行
- `/operation-runs` 運用実行ログ
- `/sources` 抽選情報の監視ソース
- `/sources/presets` 監視ソースプリセット
- `/collector-test` 抽選情報のURLテスト
- `/price-sources` 買取価格取得元
- `/price-sources/presets` 価格ソースプリセット
- `/price-checker` 価格取得 dry-run
- `/runs` 抽選情報収集ログ

## UI改善・レスポンシブ対応

毎日確認する画面を中心に、PC、タブレット、スマホ幅で見やすい配置にしています。

- `/simple` は日常利用向けのシンプルモードです。デフォルトでは受付中、利益あり、締切が近い、ROIが高い、価格信頼度が高い候補を優先して表示します。
- シンプルモードでは、応募受付中のみ、利益ありのみ、S/Aランクのみ、価格取得済みのみ、無視したものを非表示、の最小限のフィルターだけを使います。
- シンプルモードからは、元ページを開く、応募した、無視する、価格を再取得、詳細を見る、の操作だけを行えます。
- ダッシュボード上部に、最新通知、今日締切、応募候補を優先表示します。
- S/A/B/C/D の応募優先度は色付きバッジで表示し、候補の判断をしやすくしています。
- 金額、想定利益、ROI、倍率はカード内で強調表示します。
- `/lotteries` はPCでは一覧テーブル、スマホ幅では抽選ごとのカード表示に切り替わります。
- `/review` は誤検出確認用の候補をセクション別に表示し、スマホ幅でも判定ボタンを押しやすくしています。
- `/lotteries/[id]` は概要、抽選情報、利益計算、購入記録、売却記録、価格履歴に分けて確認できます。

## 監視ソース・価格ソースプリセット

`/sources/presets` では、抽選情報を取得する監視ソース候補をプリセットから追加できます。カテゴリ、推奨のみ、キーワードで絞り込み、単体追加または一括追加ができます。

`/price-sources/presets` では、買取価格を検索する価格ソース候補をプリセットから追加できます。`searchUrlTemplate` には `{keyword}` を含め、実行時に商品名をURLエンコードして差し込みます。

プリセットから追加した `WatchSource` と `PriceSource` は必ず `enabled: false` で作成します。実際に巡回する前に、URLが現在も有効か、ログイン不要の公開ページか、サイトの利用規約やアクセス方針に反しないかを確認し、ユーザーが明示的に有効化してください。

推奨プリセットでも、サイト構造やURLは変更される可能性があります。URLが不確実な候補は説明やメモに「要確認」と記載しています。壊れたURLを見つけた場合は、有効化せず、正しいURLに差し替えてから使用してください。

重複防止として、監視ソースは同じ `url` が既にある場合、価格ソースは同じ `searchUrlTemplate` または `baseUrl` が既にある場合は追加済みとして扱います。

## 禁止している設計

- 自動応募
- ログイン自動化
- CAPTCHA突破
- 複数アカウント作成
- 購入処理の自動化
- 自動売却
- 規約違反になりそうな高頻度アクセス

collector は公開ページの取得、抽選情報の検出、買取価格候補の検出だけを行います。応募・購入・売却はユーザーが手動で行い、このアプリには結果だけを記録します。

## Git管理しないもの

以下はローカル環境や個人データを含むため、Git管理しません。

- `.env`
- `node_modules`
- `.next`
- `prisma/dev.db`
- `backups/`
- `logs/`

バックアップファイル自体もリポジトリに含めないでください。

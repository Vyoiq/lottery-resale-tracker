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
npm run discover:prices
npm run classify:ai
npm run curate:sources
npm run cleanup:placeholders
npm run cleanup:ended
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

## PriceSource Discovery

`/source-discovery` と `npm run discover:prices` で、ポケモンカード・トレカ系の公開買取ページ候補を探せます。

- 公開RSS、許可された検索API、既存の公開ページから候補URLを集めます
- `BRAVE_SEARCH_API_KEY`、`BING_SEARCH_API_KEY`、`SERPAPI_API_KEY` は `.env` に設定できます
- APIキーが未設定の provider は「APIキー未設定のためスキップ」と記録して、全体処理は正常終了します
- Google検索結果ページの直接スクレイピングは行いません
- `q`、`query`、`keyword`、`word`、`search`、`name` のようなクエリパラメータから `searchUrlTemplate` を推定します
- 推定できない候補は `要確認` として保存し、PriceSource に追加しても `enabled: false` のままです
- 自動発見されたURLは必ず人が確認し、実URL・利用規約・アクセス頻度を確認してから有効化してください

`.env` 例:

```env
BRAVE_SEARCH_API_KEY=
BING_SEARCH_API_KEY=
SERPAPI_API_KEY=
```

よく使う流れ:

1. `npm run discover:prices`
2. `/source-discovery` で `価格ソース候補` を確認
3. 問題ない候補だけ PriceSource として追加
4. `/price-sources` で `検索URLあり`、`実URL候補`、テスト取得結果を確認
5. 問題ないものだけ `enabled: true`
6. 普段は `/simple` を見る

`/simple` で「有効な価格ソースがありません」と出る場合は、PriceSource Discovery を実行し、`/source-discovery` で候補を確認してから `/price-sources` で使うソースを有効化してください。

## Auto Pilot

Auto Pilot は、`/simple` に表示できる候補がないときに、不足している処理をまとめて実行する自動復旧モードです。基本コマンドは次の通りです。

```bash
npm run autopilot
```

`/simple` の空状態からも `Auto Pilotを実行` ボタンで起動できます。`/settings/operations` で `/simple 空時にAuto Pilotを自動実行` をONにすると、表示候補がない場合に自動実行できます。ただし無限ループを避けるため、既定では30分以内の再実行をスキップします。

Auto Pilot が行うこと:
- Source Discovery
- PriceSource Discovery
- AI分類
- AI Source Curator による WatchSource / PriceSource の自動登録
- PriceSource searchUrlTemplate の自動推定
- テンプレートのテスト取得
- 安全チェック済み WatchSource / PriceSource の自動有効化
- 抽選情報収集
- status 再判定
- 価格取得
- 通知生成
- 設定ONの場合のみバックアップ

Auto Pilot が行わないこと:
- 自動応募
- 自動購入
- ログイン
- CAPTCHA回避
- 高頻度アクセス

`enabled=true` になる条件:
- WatchSource は、実在URL、HTTP 200、プレースホルダーではない、ノイズではない、過去記事ではない、`current_lottery_application` または許可済みAmazon分類、ポケカ/トレカ/BOX/抽選/応募/予約/招待系キーワードあり、AI信頼度 high、`aiCanAutoEnable=true` の場合だけ自動有効化します。
- PriceSource は、実在URL、HTTP 200、プレースホルダーではない、ノイズではない、`{keyword}` を含む `searchUrlTemplate` がある、テスト取得成功、買取系HTML確認済み、AI信頼度 high、`aiCanAutoEnable=true` の場合だけ自動有効化します。

安全チェックで落ちたものは `enabled=false` のまま残ります。`/source-discovery`、`/sources`、`/price-sources` には、自動登録済みか、自動有効化できない理由、最終テスト結果、人間の確認が必要な理由を表示します。手動作業が必要になるのは、`searchUrlTemplate` を自動推定できない、AI判定が `manual_review`、HTTPエラー、ノイズ判定が曖昧、価格ページか販売ページか判断できない、利用規約上のリスクがある場合です。

## AI分類

Source Discovery や collect で拾った候補は、OpenAI API を使って追加分類できます。AI分類は記事、過去告知、通常販売ページ、買取価格ページを分け、現在応募できる抽選応募ページを `/source-discovery` と `/simple` で優先しやすくする補助機能です。

`.env` には必要に応じて以下を設定します。

```env
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

`AI_PROVIDER` は `openai` / `ollama` / `disabled` を選べます。APIキーが未設定でもアプリは停止しません。`npm run operate` や `npm run classify:ai` では「OPENAI_API_KEY 未設定のためAI分類をスキップ」と OperationRun に記録して終了します。

```bash
npm run classify:ai
```

## Auto Pilotによる0件時の自動復旧

有効なWatchSourceやPriceSourceが0件でも、まずは `/simple` を開いて `Auto Pilotで自動整理する` を使います。Auto Pilotは候補発見、AI分類、AI Source Curator、WatchSource / PriceSource自動登録、searchUrlTemplate推定、テスト取得、安全チェック、条件を満たすソースの自動有効化までをまとめて試します。

基本運用は次の流れです。

1. `/simple` を開く
2. 候補が空なら `Auto Pilotで自動整理する`
3. `/simple` に表示された候補で定価、買取価格、利益率、ROIを見て判断する
4. 自動処理で安全に判断できなかったものだけ `/source-discovery`、`/sources`、`/price-sources` で見る

`/settings/operations` では、次の自動復旧をONにできます。

- `/simple` が空ならAuto Pilotを自動実行
- 有効WatchSourceが0件ならAuto Pilotを自動実行
- 有効PriceSourceが0件ならAuto Pilotを自動実行

自動実行は30分以内の再実行を抑制し、1回あたりのDiscovery件数、AI分類件数、自動登録件数、自動有効化件数の上限を守ります。実行結果は `OperationRun` に記録されます。

手動追加や手動有効化は最後の手段です。自動処理では安全に有効化できない理由が残る場合だけ、人間が内容を見る運用にしてください。

Auto Pilotが自動化する範囲:

- 公開ページ/RSSの候補発見
- AI分類
- 監視ソース/価格ソース候補の整理
- searchUrlTemplate推定
- テスト取得
- 安全チェック済みソースの `enabled=true`
- 抽選情報収集
- 価格取得
- 通知生成

Auto Pilotが行わないこと:

- 自動応募
- 自動購入
- ログイン
- CAPTCHA回避
- 高頻度アクセス

`enabled=true` になるのは、実在URL、HTTP 200、プレースホルダーではない、ノイズではない、AI信頼度が高い、テスト取得に成功しているなどの安全条件を満たす場合だけです。`example.com`、プレースホルダー、ノイズURLは有効化しません。

確認場所:
- `/source-discovery` で AI の抽選応募ページ判定、受付中判定、理由、除外理由を確認
- `/settings/operations` の `AI分類` ボタンで手動実行
- `/simple` は AI が「抽選応募ページ」「受付中」「ポケカ/トレカ系」と判定した候補を優先し、AI が明確に除外した候補は通常表示から外す
- 分類対象は `aiClassifiedAt` が未設定のものだけです。1回の実行では負荷を抑えるため、候補URLは最大5件、抽選情報は最大10件までに制限しています

注意:
- AI分類は最終判断の補助です。応募前に必ず元ページの期間、価格、利用規約を確認してください。
- 自動応募、自動購入、ログイン自動化、CAPTCHA回避は行いません。
- 分類対象はログイン不要で閲覧できる公開ページだけです。
- APIキーは `.env` に置き、`.env` 自体は Git に含めません。

### Discovery種別と過去記事除外

候補URLは次の `discoveryType` に分けて保存します。

- `current_lottery_application`: 現在応募できる抽選応募ページ
- `ended_lottery_article`: 過去の抽選記事
- `lottery_news_article`: 抽選に関するニュース記事
- `official_product_page`: 公式商品ページ
- `price_buyback_page`: 買取価格ページ
- `sales_page`: 通常販売ページ
- `unknown`: 判定不能

`/simple` の通常表示は、`current_lottery_application` かつ AI が「抽選応募ページ」「受付中」「過去ではない」「記事ではない」と判定したものだけに絞ります。`/article/2021/11/15/...` のような古い記事URL、記事日付が30日以上前のページ、応募締切が過去のページ、ニュース記事、買取ページ、販売ページは `/simple` から外します。

既存データを再判定する場合:

```bash
npm run reclassify:sources
npm run cleanup:ended
```

### active 0件のときの確認方法

`cleanup:ended` や `operate` の結果で `active 0件` になった場合、終了済み判定は正常に動いています。次の順に確認してください。

1. `/simple` の空状態メッセージで原因を確認します。
2. 有効な `WatchSource` が0件なら `/sources` または `/source-discovery` で実URLを確認して有効化します。
3. 有効な `PriceSource` が0件なら `/source-discovery?quickFilter=price` で買取価格ページ候補を確認し、`/price-sources` で有効化します。
4. `/source-discovery?quickFilter=current` で「現在受付中候補のみ」を確認します。
5. 候補が少ない場合は `npm run discover:sources` と `npm run discover:prices` を実行します。
6. AI分類が未実行なら `npm run classify:ai` を実行します。APIキーやOllamaが未設定の場合はスキップされます。
7. 再判定が必要な場合は `npm run reclassify:sources` と `npm run cleanup:ended` を実行します。

`npm run operate` の最後にも、active抽選や有効なPriceSourceが0件の場合の次アクションを表示します。

### Source Discovery の自動判定

`DiscoveredSource` には、監視ソースや価格ソースとして使えるかを判断するための判定結果を保存します。

- `sourceUsefulness`: `watch_source` / `price_source` / `both` / `ignore` / `manual_review`
- `aiRecommendedAction`: `add_watch_source` / `add_price_source` / `add_both` / `ignore` / `manual_review`
- `aiCanAutoRegister`: 自動登録してよいか
- `aiCanAutoEnable`: 自動有効化してよいか
- `aiTrustLevel`: `high` / `medium` / `low`
- `aiSourceReason`: 登録候補と判断した理由
- `aiRiskReason`: 除外または手動確認が必要な理由

自動有効化はリスクがあるため、既定では無効です。`/settings/operations` で明示的に有効化した場合だけ、高信頼かつ低リスクの候補を `enabled: true` にできます。通常は `enabled: false` のまま登録し、人間がURLと利用規約を確認してから有効化してください。

`/source-discovery` では `discoveryType`、記事日付、応募締切、AI分類、除外理由、`/simple` 表示対象かどうかを確認できます。

### AI Source Curator

AI Source Curator は、Source Discovery と AI分類で付与された `sourceUsefulness` / `aiRecommendedAction` / `aiCanAutoRegister` / `aiTrustLevel` を見て、高信頼候補を `WatchSource` または `PriceSource` に自動登録する処理です。

```bash
npm run curate:sources
```

`npm run operate` でも、Source Discovery、PriceSource Discovery、AI分類の後に AI Source Curator を実行します。結果は `/operation-runs` に記録され、評価対象件数、WatchSource/PriceSource の自動登録件数、自動有効化件数、manual_review 件数、ignore 件数、自動登録できなかった理由を確認できます。

安全仕様:
- WatchSource はURLだけで登録できます。`searchUrlTemplate` は不要です。
- PriceSource は `searchUrlTemplate` があると、そのまま自動価格取得に使えます。
- PriceSource に `searchUrlTemplate` がない場合も、候補を baseUrl として登録します。この状態は `base_price_source_needs_template` として扱い、自動価格取得にはまだ使いません。
- `example.com`、placeholder、サンプル、要確認、ノイズURLは自動登録しません。
- 自動登録は高信頼かつ `aiCanAutoRegister=true` の候補だけです。
- 登録時の `enabled` は既定で `false` です。
- 自動有効化は `/settings/operations` で明示的にONにした場合だけ行います。
- 自動有効化される場合も、高信頼かつ `aiCanAutoEnable=true` の候補だけです。
- 自動応募、自動購入、ログイン自動化、CAPTCHA回避は行いません。

設定は `/settings/operations` で変更できます。

- AI Source Curator 有効/無効
- 高信頼WatchSource自動登録
- 高信頼PriceSource自動登録
- 高信頼WatchSource自動有効化
- 高信頼PriceSource自動有効化
- 自動登録件数上限
- 自動有効化件数上限

安全チェック済みソースの自動有効化:
- `npm run operate` は Source Discovery、PriceSource Discovery、AI分類、AI Source Curator の後に、安全チェック済みソースの自動有効化を実行します。
- WatchSource は `current_lottery_application`、AI信頼度 high（設定で high/medium も可）、`aiCanAutoEnable=true`、HTTP 200、抽選/応募/受付/ポケカ/トレカ系キーワードあり、過去記事やニュース記事ではない場合だけ `enabled=true` にします。
- PriceSource はプレースホルダーではなく、`{keyword}` を含む `searchUrlTemplate` があり、テスト取得で HTTP 200 と買取系HTMLを確認でき、AI信頼度 high（設定で high/medium も可）、`aiCanAutoEnable=true`、リスク理由なしの場合だけ `enabled=true` にします。
- 自動有効化した場合は `memo` と OperationRun に、`searchUrlTemplate推定成功`、`テスト取得HTTP 200`、`買取系HTML確認済み`、`AI信頼度 high` などの理由を残します。
- 既定では WatchSource / PriceSource の安全チェック済み自動有効化はON、最低信頼度は high、1回あたり上限はそれぞれ3件です。
- 自動有効化されたソースで失敗が続く、プレースホルダー/ノイズ判定に変わる、過去記事や販売価格ページと判定される場合は自動で `enabled=false` に戻し、理由を記録します。
- 自動有効化は公開ページの情報取得を始めるだけです。自動応募、自動購入、ログイン自動化、CAPTCHA回避は行いません。
- 通常運用はまず `npm run operate` を実行し、`/simple` を確認する流れを推奨します。

Amazon候補の扱い:
- Amazonは、Amazon.co.jp販売の招待販売、予約販売、定価付近の通常販売だけを候補にします。
- `amazon_invitation_sale`、`amazon_preorder`、`amazon_regular_sale` は `/simple` 表示対象になり得ます。
- `amazon_excluded_marketplace`、`amazon_unknown`、`amazon_unavailable` は通常候補から除外します。
- Amazonマーケットプレイス出品、中古、外部販売者、発送元/販売元がAmazon.co.jpではない商品、出品者一覧、「こちらからもご購入いただけます」系、プレ値販売は除外します。
- Amazon商品ページをWatchSource化する場合も、Amazon.co.jpの `dp/ASIN` URL、ポケモンカード/ポケカ/BOX/拡張パック系、Amazon.co.jp販売または予約/招待販売、HTTP 200、ノイズなしの場合だけ対象にします。
- 自動で招待リクエスト、自動購入、ログイン、CAPTCHA回避は行いません。

Ollama や OpenAI API の一時的なタイムアウトで分類できなかった候補は `manual_review` 扱いになります。エラー詳細は OperationRun に残しますが、他の運用タスクが成功していれば `operate` 全体は成功扱いにします。

PriceSource の確認:
- `/price-sources` では `testable_price_source` と `base_price_source_needs_template` を表示します。
- `base_price_source_needs_template` は baseUrl だけ登録済みの状態です。
- 価格取得には `{keyword}` を含む `searchUrlTemplate` が必要です。
- `/price-sources` の一覧内フォームで `searchUrlTemplate` を編集して保存できます。
- テンプレート未設定の PriceSource はテスト取得できず、有効化もできません。

searchUrlTemplate の自動推定:
- baseUrl 登録済みの PriceSource は、`/price-sources` の `テンプレート自動推定` または各行の `推定して保存` から検索URLテンプレートを推定できます。
- 推定処理は公開ページの HTML だけを取得し、`form action`、`input name`、サイト内検索リンク、`q` / `query` / `keyword` / `word` / `search` / `name` のような検索パラメータを見ます。
- 推定したテンプレートは `スペシャルBOX ポケモンセンターヒロシマ`、`ポケモンカード BOX`、`ポケカ BOX` でテスト取得し、HTTP 200 かつ買取系キーワードを確認できた場合だけ保存します。
- テンプレート推定に成功しても、既定では `enabled: false` のままです。`/settings/operations` で `テンプレート推定済みPriceSourceを自動有効化する` をONにした場合だけ、高信頼かつテスト成功した候補を自動有効化できます。
- `/simple` が空で `PriceSourceはbaseUrl登録済みですが searchUrlTemplate 未設定です` と出る場合は、まず `テンプレート自動推定を実行` を押してください。
- 推定できないサイトは、検索フォームが JavaScript 依存、ログイン必須、または検索URLの形式が特殊な可能性があります。その場合は `/price-sources` で手動確認してからテンプレートを入力してください。

### OllamaでAI分類する

OpenAI APIの課金設定を使わず、ローカルLLMでAI分類したい場合は Ollama を使えます。Ollama はインストール後、既定ではローカル API を `http://localhost:11434/api` で提供します。Ollama の structured outputs は JSON Schema を `format` に渡して使えます。

セットアップ例:

```bash
ollama pull qwen3:8b
```

`.env` の設定例:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
```

Ollama が起動していない場合、AI分類は落ちずに「Ollamaが起動していないためAI分類をスキップ」と記録します。ローカルLLMなのでOpenAI APIの課金は不要ですが、PC性能やモデルサイズによって分類は遅くなります。

OpenAI APIとの違い:
- `AI_PROVIDER=openai`: OpenAI APIを使うためAPI課金と有効なAPIキーが必要
- `AI_PROVIDER=ollama`: ローカルPCのOllamaを使うためAPI課金は不要。ただしPC負荷と実行時間が増える
- `AI_PROVIDER=disabled`: AI分類を実行しない

Ollamaでも既存のAI分類スキーマを共通利用します。structured outputs が期待どおり返らない場合は、JSONを抽出・パースし、失敗時は低信頼の「要確認」扱いで保存します。

## 終了済み抽選の整理

`collect` 実行時と `operate` 実行時には、既存の `LotteryListing` も含めて終了判定を再計算します。

- `applicationEndAt` が現在より前なら `ended`
- `applicationEndAt` が未来なら `active`
- `applicationEndAt` がなく、`purchaseDeadlineAt` が過去なら `ended`
- `resultAnnouncementAt` がかなり過去、またはタイトル/本文に `終了`、`受付終了`、`応募終了`、`販売終了` がある場合も `ended`
- 判定材料が足りない場合は `unknown`

手動で再判定したい場合:

```bash
npm run cleanup:ended
```

または `/settings/operations` の `終了済みを再判定` を使ってください。`/simple` は通常、受付中の抽選だけを表示します。過去分を確認したい場合だけ `終了済みも表示` を ON にしてください。

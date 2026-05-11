# 公開抽選販売・買取価格情報アプリ

ログイン不要で閲覧できる公開ページやRSSから、抽選販売情報と買取価格候補を取得し、利益・ROI・応募優先度・応募履歴・売却履歴を管理する個人用アプリです。

自動応募、ログイン自動化、CAPTCHA回避、複数アカウント作成、購入処理、不正アクセス、高頻度アクセスは実装しません。対象は公開ページのみです。

## 起動方法

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

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

直接開く場合は `/api/export/sales` です。

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
- `/lotteries` 抽選一覧、利益表示、応募状況、実利益、判定フィードバック、無視操作
- `/lotteries/[id]` 抽選詳細、応募・購入・売却記録、価格チェック、価格履歴、手入力補正
- `/analytics` 分析、売却履歴CSV
- `/review` 誤検出レビュー
- `/settings/score-tuning` スコア調整用の集計
- `/settings/exclusions` 除外キーワード
- `/sources` 抽選情報の監視ソース
- `/sources/presets` 監視ソースプリセット
- `/collector-test` 抽選情報のURLテスト
- `/price-sources` 買取価格取得元
- `/price-checker` 価格取得 dry-run
- `/runs` 抽選情報収集ログ

## 禁止している設計

- 自動応募
- ログイン自動化
- CAPTCHA突破
- 複数アカウント作成
- 購入処理の自動化
- 自動売却
- 規約違反になりそうな高頻度アクセス

collector は公開ページの取得、抽選情報の検出、買取価格候補の検出だけを行います。応募・購入・売却はユーザーが手動で行い、このアプリには結果だけを記録します。

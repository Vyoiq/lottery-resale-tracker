export function errorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function operationFailureMessage(label: string, error: unknown) {
  return [
    `${label}に失敗しました。`,
    "",
    "確認ポイント:",
    "- 監視ソースまたは価格ソースが有効になっているか",
    "- 対象URLがログイン不要の公開ページとして開けるか",
    "- .env の DATABASE_URL が正しいか",
    "- ネットワーク接続、アクセス頻度、サイト側の一時エラーがないか",
    "",
    `詳細: ${errorDetail(error)}`
  ].join("\n");
}

export function apiErrorBody(label: string, error: unknown) {
  return {
    ok: false,
    error: `${label}に失敗しました。`,
    message: operationFailureMessage(label, error),
    detail: errorDetail(error)
  };
}

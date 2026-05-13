"use client";

import { useState } from "react";

type RestoreBackupButtonProps = {
  id: string;
  filename: string;
  createdAt: string;
  size: string;
};

export function RestoreBackupButton({ id, filename, createdAt, size }: RestoreBackupButtonProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  async function restore() {
    const confirmed = window.confirm([
      "バックアップから復元します。",
      "",
      "現在のSQLite DBは復元対象の内容で上書きされます。",
      "復元前に現在のDBを自動バックアップしますが、実行中は他の操作をしないでください。",
      "",
      `復元対象: ${filename}`,
      `作成日時: ${createdAt}`,
      `サイズ: ${size}`,
      "",
      "続行しますか？"
    ].join("\n"));
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const response = await fetch(`/api/backups/${id}/restore`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) {
        window.alert(body.message ?? body.error ?? "バックアップ復元に失敗しました。");
        return;
      }

      window.alert([
        "バックアップを復元しました。",
        body.preRestoreBackup?.filename ? `復元前バックアップ: ${body.preRestoreBackup.filename}` : null,
        "運用実行ログで結果を確認できます。"
      ].filter(Boolean).join("\n"));
      window.location.href = "/operation-runs";
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={restore}
      disabled={isRestoring}
    >
      {isRestoring ? "復元中" : "復元"}
    </button>
  );
}

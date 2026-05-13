import { access, copyFile, mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { operationFailureMessage } from "@/lib/errorMessages";

export type CreateBackupInput = {
  memo?: string | null;
};

export function getBackupDirectory() {
  return path.resolve(process.cwd(), "backups");
}

export function getBackupFilePath(filename: string) {
  return path.join(getBackupDirectory(), filename);
}

export async function createBackup(input: CreateBackupInput = {}, client: PrismaClient = defaultPrisma) {
  const dbPath = await resolveSqliteDatabasePath();
  const backupDir = getBackupDirectory();
  await mkdir(backupDir, { recursive: true });

  // Flush WAL pages before copying so the backup is useful even when SQLite uses WAL mode.
  try {
    await client.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
  } catch {
    // Copying still works for the default rollback-journal mode. The caller should not fail only because checkpoint is unavailable.
  }

  const filename = `backup-${formatBackupTimestamp(new Date())}.db`;
  const absoluteBackupPath = getBackupFilePath(filename);
  await copyFile(dbPath, absoluteBackupPath);
  const fileStat = await stat(absoluteBackupPath);
  const relativePath = path.join("backups", filename);

  return client.backupRecord.create({
    data: {
      filename,
      path: relativePath,
      sizeBytes: fileStat.size,
      memo: input.memo?.trim() || null
    }
  });
}

export async function deleteBackup(id: string, client: PrismaClient = defaultPrisma) {
  const record = await client.backupRecord.findUnique({ where: { id } });
  if (!record) return null;

  const absolutePath = resolveBackupRecordPath(record.path);
  await unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });

  await client.backupRecord.delete({ where: { id } });
  return record;
}

export async function pruneBackups(retentionCount: number, client: PrismaClient = defaultPrisma) {
  const safeRetention = Math.max(1, Math.trunc(retentionCount));
  const records = await client.backupRecord.findMany({
    orderBy: { createdAt: "desc" }
  });
  const expired = records.slice(safeRetention);

  for (const record of expired) {
    await deleteBackup(record.id, client);
  }

  return expired.length;
}

export async function restoreBackup(id: string, client: PrismaClient = defaultPrisma) {
  const startedAt = new Date();
  const record = await client.backupRecord.findUnique({ where: { id } });
  if (!record) {
    throw new Error("復元対象のバックアップが見つかりません。");
  }

  const sourcePath = resolveBackupDbPath(record.path);
  const sourceStat = await stat(sourcePath);
  if (!sourceStat.isFile()) {
    throw new Error("復元対象がファイルではありません。");
  }

  const dbPath = await resolveSqliteDatabasePath();
  let preRestoreBackup: { filename: string; path: string; sizeBytes: number } | null = null;

  try {
    preRestoreBackup = await createPreRestoreBackup(client, dbPath);

    // Release Prisma's SQLite handle before replacing the database file.
    await client.$disconnect();
    await removeSqliteSidecarFiles(dbPath);
    await copyFile(sourcePath, dbPath);
    await removeSqliteSidecarFiles(dbPath);

    const restoredClient = client;
    if (preRestoreBackup) {
      const existingPreRestoreRecord = await restoredClient.backupRecord.findFirst({ where: { path: preRestoreBackup.path } });
      if (existingPreRestoreRecord) {
        await restoredClient.backupRecord.update({
          where: { id: existingPreRestoreRecord.id },
          data: {
            filename: preRestoreBackup.filename,
            sizeBytes: preRestoreBackup.sizeBytes,
            memo: "復元前に自動作成したバックアップ"
          }
        });
      } else {
        await restoredClient.backupRecord.create({
          data: {
            filename: preRestoreBackup.filename,
            path: preRestoreBackup.path,
            sizeBytes: preRestoreBackup.sizeBytes,
            memo: "復元前に自動作成したバックアップ"
          }
        });
      }
    }

    const message = [
      `復元しました: ${record.filename}`,
      `復元元サイズ: ${sourceStat.size} bytes`,
      preRestoreBackup ? `復元前バックアップ: ${preRestoreBackup.filename}` : null
    ].filter(Boolean).join("\n");

    const run = await restoredClient.operationRun.create({
      data: {
        type: "restore_backup",
        startedAt,
        finishedAt: new Date(),
        success: true,
        message
      }
    });

    return { restored: record, preRestoreBackup, operationRun: run };
  } catch (error) {
    const message = operationFailureMessage("バックアップ復元", error);
    try {
      await client.operationRun.create({
        data: {
          type: "restore_backup",
          startedAt,
          finishedAt: new Date(),
          success: false,
          message
        }
      });
    } catch {
      // If the database file is unavailable, the API response still carries the failure details.
    }
    throw new Error(message);
  }
}

export function resolveBackupRecordPath(recordPath: string) {
  const backupDir = getBackupDirectory();
  const absolutePath = path.isAbsolute(recordPath) ? path.resolve(recordPath) : path.resolve(process.cwd(), recordPath);
  const relative = path.relative(backupDir, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Backup path is outside the backups directory.");
  }
  return absolutePath;
}

export function resolveBackupDbPath(recordPath: string) {
  const absolutePath = resolveBackupRecordPath(recordPath);
  if (path.extname(absolutePath).toLowerCase() !== ".db") {
    throw new Error("復元できるのは backups/ 配下の .db ファイルだけです。");
  }
  return absolutePath;
}

async function resolveSqliteDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("Only SQLite file: DATABASE_URL backups are supported.");
  }

  const rawPath = decodeURIComponent(databaseUrl.slice("file:".length).split("?")[0]);
  const candidates = path.isAbsolute(rawPath)
    ? [rawPath]
    : [path.resolve(process.cwd(), "prisma", rawPath), path.resolve(process.cwd(), rawPath)];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common Prisma SQLite path.
    }
  }

  throw new Error(`SQLite database file was not found: ${rawPath}`);
}

async function createPreRestoreBackup(client: PrismaClient, dbPath: string) {
  const backupDir = getBackupDirectory();
  await mkdir(backupDir, { recursive: true });

  try {
    await client.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
  } catch {
    // Rollback-journal mode does not need a WAL checkpoint.
  }

  const filename = `pre-restore-backup-${formatCompactTimestamp(new Date())}.db`;
  const absoluteBackupPath = getBackupFilePath(filename);
  await copyFile(dbPath, absoluteBackupPath);
  const fileStat = await stat(absoluteBackupPath);
  const relativePath = path.join("backups", filename);

  await client.backupRecord.create({
    data: {
      filename,
      path: relativePath,
      sizeBytes: fileStat.size,
      memo: "復元前に自動作成したバックアップ"
    }
  });

  return { filename, path: relativePath, sizeBytes: fileStat.size };
}

async function removeSqliteSidecarFiles(dbPath: string) {
  const sidecars = [`${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`];
  for (const file of sidecars) {
    await unlink(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

function formatBackupTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function formatCompactTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

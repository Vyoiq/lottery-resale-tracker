import { access, copyFile, mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

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
    await client.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
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

export function resolveBackupRecordPath(recordPath: string) {
  const backupDir = getBackupDirectory();
  const absolutePath = path.isAbsolute(recordPath) ? path.resolve(recordPath) : path.resolve(process.cwd(), recordPath);
  const relative = path.relative(backupDir, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Backup path is outside the backups directory.");
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

function formatBackupTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

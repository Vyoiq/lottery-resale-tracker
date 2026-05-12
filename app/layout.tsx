import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  BarChart3,
  Bell,
  CircleDollarSign,
  ClipboardList,
  Database,
  FlaskConical,
  Home,
  RadioTower,
  ScrollText,
  Settings,
  SlidersHorizontal
} from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "抽選販売・買取価格情報管理アプリ",
  description: "公開ページやRSSから抽選販売情報と買取価格候補を収集し、応募状況と利益実績を管理する個人用アプリ"
};

const navItems = [
  { href: "/", label: "ダッシュボード", icon: Home },
  { href: "/notifications", label: "通知", icon: Bell },
  { href: "/backups", label: "バックアップ", icon: Archive },
  { href: "/lotteries", label: "抽選一覧", icon: ClipboardList },
  { href: "/analytics", label: "分析", icon: BarChart3 },
  { href: "/review", label: "誤検出レビュー", icon: BarChart3 },
  { href: "/sources", label: "監視ソース", icon: RadioTower },
  { href: "/collector-test", label: "抽選テスト", icon: FlaskConical },
  { href: "/price-sources", label: "価格ソース", icon: CircleDollarSign },
  { href: "/price-checker", label: "価格テスト", icon: FlaskConical },
  { href: "/settings/exclusions", label: "除外設定", icon: Settings },
  { href: "/settings/score-tuning", label: "スコア調整", icon: SlidersHorizontal },
  { href: "/runs", label: "収集ログ", icon: ScrollText }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen">
          <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card px-4 py-5 lg:block">
            <div className="mb-7 flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Database size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold">Lottery Listings</div>
                <div className="text-xs text-muted-foreground">公開情報と実績管理</div>
              </div>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <div className="lg:pl-64">
            <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-3 backdrop-blur lg:hidden">
              <div className="mb-3 text-sm font-semibold">Lottery Listings</div>
              <nav className="flex gap-2 overflow-x-auto pb-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-md bg-muted px-3 py-2 text-xs font-medium">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </header>
            <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

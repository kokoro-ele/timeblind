import type { Locale } from "./config";

export interface Messages {
  command: {
    cta: string; // uses {key}
    placeholder: string;
    empty: string;
    navigate: string;
    links: string;
  };
  nav: {
    tech: string;
    timeline: string;
    concerts: string;
    travel: string;
    status: string;
    github: string;
  };
  cards: {
    tech: string;
    status: string;
    timeline: string;
    concerts: string;
    travel: string;
  };
  tech: {
    hint: string;
    tasks: string;
  };
  timeline: {
    author: string;
    date: string;
    achievements: string;
  };
  concert: {
    wallet: string;
    memorabilia: string;
    history: string;
    ended: string;
    stampRing: string;
    viewNotes: string;
    prev: string;
    next: string;
    pageOf: string; // uses {page}, {total}
  };
  travel: {
    nodes: string;
    orbitKm: string;
    home: string;
    decodeHint: string;
    booting: string;
    ping: string; // uses {name}
  };
  system: {
    status: string;
    loc: string;
    time: string;
    mission: string;
    uptime: string;
    console: string;
  };
  footer: {
    built: string; // uses {year}
    dataDriven: string;
  };
  lang: {
    label: string;
  };
}

const en: Messages = {
  command: {
    cta: "Press {key} to explore...",
    placeholder: "Type a destination — tech, live, travel...",
    empty: "no route found :: 404",
    navigate: "Navigate",
    links: "Links",
  },
  nav: {
    tech: "Tech Stack",
    timeline: "Experience",
    concerts: "Ticket Wallet",
    travel: "Footprints",
    status: "System State",
    github: "GitHub",
  },
  cards: {
    tech: "System Console · Tech Stack",
    status: "System State",
    timeline: "Experience · git log",
    concerts: "Ticket Wallet · Live",
    travel: "Travel · Footprints Radar",
  },
  tech: {
    hint: "// cats & critters wander — hover to scatter",
    tasks: "tasks",
  },
  timeline: {
    author: "Author",
    date: "Date",
    achievements: "# achievements unlocked",
  },
  concert: {
    wallet: "Ticket Wallet",
    memorabilia: "Keepsake Book",
    history: "Past Stubs",
    ended: "ENDED",
    stampRing: "SHOW START LIVE · MOHS · ",
    viewNotes: "View notes",
    prev: "Prev",
    next: "Next",
    pageOf: "{page} / {total}",
  },
  travel: {
    nodes: "nodes",
    orbitKm: "orbit_km",
    home: "home",
    decodeHint: "hover a glowing node to decode the travel log",
    booting: "booting orbital uplink",
    ping: "> ping {name}",
  },
  system: {
    status: "SYS_STATUS",
    loc: "LOC",
    time: "TIME",
    mission: "echo $MISSION",
    uptime: "uptime",
    console: "open F12",
  },
  footer: {
    built: "built with next.js · three.js · webgl · {year}",
    dataDriven: "data-driven // edit data/*.json to update",
  },
  lang: {
    label: "Language",
  },
};

const zh: Messages = {
  command: {
    cta: "按 {key} 开始探索...",
    placeholder: "输入目的地 —— tech、live、travel...",
    empty: "未找到路由 :: 404",
    navigate: "导航",
    links: "链接",
  },
  nav: {
    tech: "技术栈",
    timeline: "履历",
    concerts: "票夹",
    travel: "足迹",
    status: "系统状态",
    github: "GitHub",
  },
  cards: {
    tech: "系统控制台 · 技术栈",
    status: "系统状态",
    timeline: "履历 · git log",
    concerts: "票夹 · Live",
    travel: "旅行 · 足迹雷达",
  },
  tech: {
    hint: "// 猫猫和小动物自己溜达 —— 鼠标靠近会跑开",
    tasks: "任务",
  },
  timeline: {
    author: "作者",
    date: "日期",
    achievements: "# 已解锁成就",
  },
  concert: {
    wallet: "票夹",
    memorabilia: "纪念票册",
    history: "历史票根",
    ended: "已结束",
    stampRing: "SHOW START MOHS · LIVE · ",
    viewNotes: "查收邀请函",
    prev: "上一页",
    next: "下一页",
    pageOf: "{page} / {total}",
  },
  travel: {
    nodes: "节点",
    orbitKm: "轨迹_公里",
    home: "起点",
    decodeHint: "悬停发光节点以解码旅行日志",
    booting: "正在建立轨道链路",
    ping: "> ping {name}",
  },
  system: {
    status: "系统状态",
    loc: "坐标",
    time: "时间",
    mission: "echo $使命",
    uptime: "运行时长",
    console: "打开 F12",
  },
  footer: {
    built: "由 next.js · three.js · webgl 构建 · {year}",
    dataDriven: "数据驱动 // 修改 data/*.json 即可更新",
  },
  lang: {
    label: "语言",
  },
};

const ja: Messages = {
  command: {
    cta: "{key} を押して探索...",
    placeholder: "行き先を入力 — tech、live、travel...",
    empty: "ルートが見つかりません :: 404",
    navigate: "ナビゲーション",
    links: "リンク",
  },
  nav: {
    tech: "技術スタック",
    timeline: "経歴",
    concerts: "チケットホルダー",
    travel: "足跡",
    status: "システム状態",
    github: "GitHub",
  },
  cards: {
    tech: "システムコンソール · 技術スタック",
    status: "システム状態",
    timeline: "経歴 · git log",
    concerts: "チケットホルダー · Live",
    travel: "旅 · 足跡レーダー",
  },
  tech: {
    hint: "// 猫たちが歩き回る —— カーソルを近づけると逃げる",
    tasks: "タスク",
  },
  timeline: {
    author: "作成者",
    date: "日付",
    achievements: "# 解放された実績",
  },
  concert: {
    wallet: "チケットホルダー",
    memorabilia: "記念チケット帳",
    history: "過去の半券",
    ended: "終了",
    stampRing: "SHOW START LIVE · MOHS · ",
    viewNotes: "ノートを見る",
    prev: "前へ",
    next: "次へ",
    pageOf: "{page} / {total}",
  },
  travel: {
    nodes: "ノード",
    orbitKm: "軌道_km",
    home: "拠点",
    decodeHint: "光るノードにホバーして旅行ログを解読",
    booting: "軌道アップリンクを起動中",
    ping: "> ping {name}",
  },
  system: {
    status: "SYS_STATUS",
    loc: "位置",
    time: "時刻",
    mission: "echo $MISSION",
    uptime: "稼働時間",
    console: "F12 を開く",
  },
  footer: {
    built: "next.js · three.js · webgl で構築 · {year}",
    dataDriven: "データ駆動 // data/*.json を編集して更新",
  },
  lang: {
    label: "言語",
  },
};

export const messages: Record<Locale, Messages> = { en, zh, ja };

/** Tiny {placeholder} interpolation helper. */
export function fmt(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

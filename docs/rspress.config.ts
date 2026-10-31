import * as path from 'path';
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'zh-cn',
  title: 'MailPort',
  description:
    '把邮件发送变成 HTTP API。每个发件商拥有独立接口与 API 密钥，在网页控制台中统一管理。',
  icon: '/mailport-logo.png',
  base: '/',
  globalStyles: path.join(__dirname, 'styles/home.css'),
  locales: [
    {
      lang: 'zh-cn',
      label: '简体中文',
      title: 'MailPort 文档',
      description: '把邮件发送变成 HTTP API，每个发件商拥有独立接口与 API 密钥。',
    },
    {
      lang: 'en',
      label: 'English',
      title: 'MailPort Docs',
      description:
        'Turn email sending into an HTTP API. One endpoint and API key set per sender.',
    },
    {
      lang: 'zh-TW',
      label: '繁體中文',
      title: 'MailPort 文件',
      description: '把郵件傳送變成 HTTP API。每個寄件商擁有獨立介面與 API 金鑰。',
    },
    {
      lang: 'ja',
      label: '日本語',
      title: 'MailPort Docs',
      description:
        'メール送信を HTTP API に変換。一つのエンドポイントと API キーセットを各送信者に提供。',
    },
  ],
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/wool-hmq/mailport',
      },
    ],
  },
  builderConfig: {
    server: {
      allowedHosts: ['.monkeycode-ai.online'],
    },
  },
  i18nSource: {
    outlineTitle: {
      'zh-cn': '大纲',
      'zh-TW': '大綱',
      en: 'ON THIS PAGE',
      ja: 'このページの内容',
    },
    languagesText: {
      'zh-cn': '语言',
      'zh-TW': '語言',
      en: 'Languages',
      ja: '言語',
    },
    themeText: {
      'zh-cn': '主题',
      'zh-TW': '主題',
      en: 'Theme',
      ja: 'テーマ',
    },
    versionsText: {
      'zh-cn': '版本',
      'zh-TW': '版本',
      en: 'Versions',
      ja: 'バージョン',
    },
    menuTitle: {
      'zh-cn': '菜单',
      'zh-TW': '選單',
      en: 'Menu',
      ja: 'メニュー',
    },
    scrollToTopText: {
      'zh-cn': '回到顶部',
      'zh-TW': '回到頂部',
      en: 'Scroll to top',
      ja: 'トップへスクロール',
    },
    lastUpdatedText: {
      'zh-cn': '最后更新于',
      'zh-TW': '最後更新於',
      en: 'Last updated on',
      ja: '最終更新',
    },
    lastUpdatedAuthorText: {
      'zh-cn': '最后更新者',
      'zh-TW': '最後更新者',
      en: 'Last updated by',
      ja: '最終更新者',
    },
    prevPageText: {
      'zh-cn': '上一页',
      'zh-TW': '上一頁',
      en: 'Previous page',
      ja: '前のページ',
    },
    nextPageText: {
      'zh-cn': '下一页',
      'zh-TW': '下一頁',
      en: 'Next page',
      ja: '次のページ',
    },
    sourceCodeText: {
      'zh-cn': '查看源代码',
      'zh-TW': '檢視原始碼',
      en: 'Source code',
      ja: 'ソースコード',
    },
    searchPlaceholderText: {
      'zh-cn': '搜索',
      'zh-TW': '搜尋',
      en: 'Search',
      ja: '検索',
    },
    searchPanelCancelText: {
      'zh-cn': '取消',
      'zh-TW': '取消',
      en: 'Cancel',
      ja: 'キャンセル',
    },
    searchNoResultsText: {
      'zh-cn': '未找到相关结果',
      'zh-TW': '未找到相關結果',
      en: 'No results found',
      ja: '結果が見つかりません',
    },
    searchSuggestedQueryText: {
      'zh-cn': '建议搜索',
      'zh-TW': '建議搜尋',
      en: 'Suggested query',
      ja: '推奨検索',
    },
    'overview.filterNameText': {
      'zh-cn': '按名称筛选',
      'zh-TW': '按名稱篩選',
      en: 'Filter by name',
      ja: '名前でフィルター',
    },
    'overview.filterPlaceholderText': {
      'zh-cn': '输入筛选条件',
      'zh-TW': '輸入篩選條件',
      en: 'Type to filter',
      ja: 'フィルター条件を入力',
    },
    'overview.filterNoResultText': {
      'zh-cn': '未找到匹配的接口',
      'zh-TW': '未找到符合的介面',
      en: 'No matching endpoint',
      ja: '一致するエンドポイントがありません',
    },
    openInText: {
      'zh-cn': '在新窗口打开',
      'zh-TW': '在新視窗開啟',
      en: 'Open in new window',
      ja: '新しいウィンドウで開く',
    },
    copyMarkdownText: {
      'zh-cn': '复制 Markdown 内容',
      'zh-TW': '複製 Markdown 內容',
      en: 'Copy Markdown content',
      ja: 'Markdown 内容をコピー',
    },
    copyMarkdownLinkText: {
      'zh-cn': '复制 Markdown 链接',
      'zh-TW': '複製 Markdown 連結',
      en: 'Copy Markdown link',
      ja: 'Markdown リンクをコピー',
    },
    editLinkText: {
      'zh-cn': '在 GitHub 上编辑此页',
      'zh-TW': '在 GitHub 上編輯此頁',
      en: 'Edit this page on GitHub',
      ja: 'GitHub でこのアイテムを編集',
    },
    codeButtonGroupCopyButtonText: {
      'zh-cn': '复制代码',
      'zh-TW': '複製程式碼',
      en: 'Copy code',
      ja: 'コードをコピー',
    },
    codeButtonGroupWrapButtonText: {
      'zh-cn': '切换换行',
      'zh-TW': '切換換行',
      en: 'Toggle wrap',
      ja: '折り返し切替',
    },
    notFoundText: {
      'zh-cn': '页面不存在',
      'zh-TW': '頁面不存在',
      en: 'Page not found',
      ja: 'ページが見つかりません',
    },
    takeMeHomeText: {
      'zh-cn': '返回首页',
      'zh-TW': '返回首頁',
      en: 'Take me home',
      ja: 'ホームへ戻る',
    },
    promptCopyText: {
      'zh-cn': '复制',
      'zh-TW': '複製',
      en: 'Copy',
      ja: 'コピー',
    },
    promptCopiedText: {
      'zh-cn': '已复制',
      'zh-TW': '已複製',
      en: 'Copied',
      ja: 'コピーしました',
    },
    promptExpandText: {
      'zh-cn': '展开',
      'zh-TW': '展開',
      en: 'Expand',
      ja: '展開',
    },
    promptCollapseText: {
      'zh-cn': '收起',
      'zh-TW': '收起',
      en: 'Collapse',
      ja: '折りたたむ',
    },
  },
});

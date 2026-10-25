import * as path from 'path';
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'zh-cn',
  title: 'MailPort',
  description:
    '把邮件发送变成 HTTP API。每个发件商拥有独立接口与 API 密钥，在网页控制台中统一管理。',
  icon: '/mailport-icon.svg',
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
      en: 'ON THIS PAGE',
    },
    languagesText: {
      'zh-cn': '语言',
      en: 'Languages',
    },
    themeText: {
      'zh-cn': '主题',
      en: 'Theme',
    },
    versionsText: {
      'zh-cn': '版本',
      en: 'Versions',
    },
    menuTitle: {
      'zh-cn': '菜单',
      en: 'Menu',
    },
    scrollToTopText: {
      'zh-cn': '回到顶部',
      en: 'Scroll to top',
    },
    lastUpdatedText: {
      'zh-cn': '最后更新于',
      en: 'Last updated on',
    },
    lastUpdatedAuthorText: {
      'zh-cn': '最后更新者',
      en: 'Last updated by',
    },
    prevPageText: {
      'zh-cn': '上一页',
      en: 'Previous page',
    },
    nextPageText: {
      'zh-cn': '下一页',
      en: 'Next page',
    },
    sourceCodeText: {
      'zh-cn': '查看源代码',
      en: 'Source code',
    },
    searchPlaceholderText: {
      'zh-cn': '搜索',
      en: 'Search',
    },
    searchPanelCancelText: {
      'zh-cn': '取消',
      en: 'Cancel',
    },
    searchNoResultsText: {
      'zh-cn': '未找到相关结果',
      en: 'No results found',
    },
    searchSuggestedQueryText: {
      'zh-cn': '建议搜索',
      en: 'Suggested query',
    },
    'overview.filterNameText': {
      'zh-cn': '按名称筛选',
      en: 'Filter by name',
    },
    'overview.filterPlaceholderText': {
      'zh-cn': '输入筛选条件',
      en: 'Type to filter',
    },
    'overview.filterNoResultText': {
      'zh-cn': '未找到匹配的接口',
      en: 'No matching endpoint',
    },
    openInText: {
      'zh-cn': '在新窗口打开',
      en: 'Open in new window',
    },
    copyMarkdownText: {
      'zh-cn': '复制 Markdown 内容',
      en: 'Copy Markdown content',
    },
    copyMarkdownLinkText: {
      'zh-cn': '复制 Markdown 链接',
      en: 'Copy Markdown link',
    },
    editLinkText: {
      'zh-cn': '在 GitHub 上编辑此页',
      en: 'Edit this page on GitHub',
    },
    codeButtonGroupCopyButtonText: {
      'zh-cn': '复制代码',
      en: 'Copy code',
    },
    codeButtonGroupWrapButtonText: {
      'zh-cn': '切换换行',
      en: 'Toggle wrap',
    },
    notFoundText: {
      'zh-cn': '页面不存在',
      en: 'Page not found',
    },
    takeMeHomeText: {
      'zh-cn': '返回首页',
      en: 'Take me home',
    },
    promptCopyText: {
      'zh-cn': '复制',
      en: 'Copy',
    },
    promptCopiedText: {
      'zh-cn': '已复制',
      en: 'Copied',
    },
    promptExpandText: {
      'zh-cn': '展开',
      en: 'Expand',
    },
    promptCollapseText: {
      'zh-cn': '收起',
      en: 'Collapse',
    },
  },
});

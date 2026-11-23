const redirects = new Set(['custom.html', 'coconut-story.html']);
function publicHtml(file, html) {
  if (redirects.has(file)) html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=index.html#scenes"><title>元梦创作工坊</title></head><body><a href="index.html#scenes">返回地图工坊</a></body></html>';
  html = html.replace(/<a\b[^>]*href="(?:\.\.\/)*(?:custom|coconut-story)\.html[^" ]*"[^>]*>[\s\S]*?<\/a>/g, '');
  return html.replace(/(<html\b[^>]*>)/i, '$1<script>window.__WORKSHOP_ONLINE__=true;</script>');
}
module.exports = { publicHtml };

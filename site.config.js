module.exports = {
  name: 'qnxy',
  url: 'https://www.qianianxy.cn',
  email: 'jinxihe@mail.bnu.edu.cn',
  featured: ['线性基', 'KMP', '笛卡尔树'],
  unpublished: ['question-resource', 'hufuyezhong'],
  education: {
    zh: '本科 · 北京师范大学（珠海校区） · 数学与应用数学 · 2023–2027',
    en: 'Undergraduate · Beijing Normal University (Zhuhai Campus) · Mathematics and Applied Mathematics · 2023–2027',
    masters: {
      zh: '硕士 · 哈尔滨工业大学（深圳） · 人工智能 · 2027–2030',
      en: 'Master’s · Harbin Institute of Technology (Shenzhen) · Artificial Intelligence · 2027–2030'
    }
  },
  social: [
    { name: 'GitHub', url: 'https://github.com/3154638220' },
    { name: 'Codeforces', url: 'https://codeforces.com/profile/James_He' },
    { name: 'AtCoder', url: 'https://atcoder.jp/users/qnxy' }
  ],
  projects: [
    { name: 'Personal Website', nameZh: '个人网站', type: '01 / WEB',
      zh: '这个网站的源代码。使用原生 HTML、CSS 和 JavaScript 构建，支持 Markdown 文章生成与静态部署。',
      en: 'The source of this website. Built with HTML, CSS and JavaScript, with Markdown publishing and static deployment.',
      tech: ['HTML / CSS / JavaScript', 'Markdown', 'Static publishing'],
      url: 'https://github.com/3154638220/personal-web', art: 'orbit' },
    { name: 'Quant Stock Advisor', nameZh: 'A 股量化选股助手', type: '02 / QUANT',
      zh: '本地化 A 股量化流水线：AkShare 数据写入 DuckDB，结合 GPU 因子计算、XGBoost 与序列模型，进行市场状态识别、组合优化和向量回测。',
      en: 'A local A-share quant pipeline: AkShare to DuckDB, GPU factor computation, XGBoost and sequence models, regime detection, portfolio optimization and vector backtesting.',
      tech: ['Python / PyTorch', 'DuckDB / AkShare', 'XGBoost'],
      url: 'https://github.com/3154638220/quant-stock-advisor', art: 'wave' }
  ]
};

const sdks = [
  {
    lang: 'Java',
    icon: 'java',
    packages: [
      {
        id: 'java-core',
        name: 'huaweicloud-sdk-java-v3',
        version: '3.1.90',
        description: '华为云 Java SDK（V3），覆盖全量云服务，支持 JDK 8+',
        descriptionEn: 'HuaweiCloud Java SDK (V3), covering all cloud services, supports JDK 8+',
        maven: 'com.huaweicloud.sdk:huaweicloud-sdk-all:3.1.90',
        pip: null,
        go: null,
        npm: null,
        githubUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-java-v3',
        docUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-java-v3/blob/master/README.md',
        publishedAt: '2024-03-18',
        changelog: ['新增 ECS、EVS 接口支持', '修复认证模块内存泄漏问题'],
        changelogEn: ['Add ECS and EVS interface support', 'Fix memory leak in auth module'],
      },
    ],
  },
  {
    lang: 'Python',
    icon: 'python',
    packages: [
      {
        id: 'python-core',
        name: 'huaweicloudsdkall',
        version: '3.1.90',
        description: '华为云 Python SDK，支持 Python 3.3+，涵盖全量服务',
        descriptionEn: 'HuaweiCloud Python SDK, supports Python 3.3+, covers all services',
        pip: 'pip install huaweicloudsdkall==3.1.90',
        maven: null, go: null, npm: null,
        githubUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-python-v3',
        docUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-python-v3/blob/master/README.md',
        publishedAt: '2024-03-18',
        changelog: ['优化 Region 解析逻辑', '新增 ModelArts SDK 模块'],
        changelogEn: ['Optimize Region parsing logic', 'Add ModelArts SDK module'],
      },
    ],
  },
  {
    lang: 'Go',
    icon: 'go',
    packages: [
      {
        id: 'go-core',
        name: 'huaweicloud-sdk-go-v3',
        version: '0.1.90',
        description: '华为云 Go SDK，支持 Go 1.14+，模块化设计',
        descriptionEn: 'HuaweiCloud Go SDK, supports Go 1.14+, modular design',
        go: 'go get github.com/huaweicloud/huaweicloud-sdk-go-v3',
        pip: null, maven: null, npm: null,
        githubUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-go-v3',
        docUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-go-v3/blob/master/README.md',
        publishedAt: '2024-03-15',
        changelog: ['支持 STS 临时凭证认证', '新增 OBS Go SDK 集成示例'],
        changelogEn: ['Support STS temporary credential auth', 'Add OBS Go SDK integration example'],
      },
    ],
  },
  {
    lang: 'Node.js',
    icon: 'nodejs',
    packages: [
      {
        id: 'nodejs-core',
        name: '@huaweicloud/huaweicloud-sdk-core',
        version: '0.0.61',
        description: '华为云 Node.js SDK，支持 Node 10.16.1+，TypeScript 友好',
        descriptionEn: 'HuaweiCloud Node.js SDK, supports Node 10.16.1+, TypeScript friendly',
        npm: 'npm install @huaweicloud/huaweicloud-sdk-core',
        pip: null, maven: null, go: null,
        githubUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-nodejs-v3',
        docUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-nodejs-v3/blob/master/README.md',
        publishedAt: '2024-02-28',
        changelog: ['TypeScript 类型定义更新', '修复分页查询工具类'],
        changelogEn: ['Update TypeScript type definitions', 'Fix pagination query utility'],
      },
    ],
  },
  {
    lang: 'PHP',
    icon: 'php',
    packages: [
      {
        id: 'php-core',
        name: 'huaweicloud/huaweicloud-sdk-php',
        version: '3.1.90',
        description: '华为云 PHP SDK，支持 PHP 5.6+，Composer 管理依赖',
        descriptionEn: 'HuaweiCloud PHP SDK, supports PHP 5.6+, managed by Composer',
        npm: 'composer require huaweicloud/huaweicloud-sdk-php:3.1.90',
        pip: null, maven: null, go: null,
        githubUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-php-v3',
        docUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-php-v3/blob/master/README.md',
        publishedAt: '2024-02-20',
        changelog: ['新增异步请求支持', '升级 Guzzle 依赖至 7.x'],
        changelogEn: ['Add async request support', 'Upgrade Guzzle dependency to 7.x'],
      },
    ],
  },
  {
    lang: 'C#',
    icon: 'csharp',
    packages: [
      {
        id: 'csharp-core',
        name: 'HuaweiCloud.SDK.All',
        version: '3.1.90',
        description: '华为云 C# SDK，支持 .NET Standard 2.0+，NuGet 分发',
        descriptionEn: 'HuaweiCloud C# SDK, supports .NET Standard 2.0+, distributed via NuGet',
        npm: 'dotnet add package HuaweiCloud.SDK.All --version 3.1.90',
        pip: null, maven: null, go: null,
        githubUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-net-v3',
        docUrl: 'https://github.com/huaweicloud/huaweicloud-sdk-net-v3/blob/master/README.md',
        publishedAt: '2024-03-10',
        changelog: ['修复 IAM Token 并发更新问题', '新增 ELB V3 接口'],
        changelogEn: ['Fix IAM Token concurrent update issue', 'Add ELB V3 interfaces'],
      },
    ],
  },
];

exports.sdkHandler = (req, res) => {
  const { lang } = req.query;
  const data = lang ? sdks.filter(s => s.lang.toLowerCase() === lang.toLowerCase()) : sdks;
  res.json({ code: 0, data });
};

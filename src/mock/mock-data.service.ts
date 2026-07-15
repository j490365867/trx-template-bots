import { Injectable } from "@nestjs/common";

export interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  condition: string;
  wind: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  time: string;
}

export interface JokeItem {
  content: string;
  type: string;
}

export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

@Injectable()
export class MockDataService {
  getWeather(city: string): WeatherData {
    const mockData: Record<string, WeatherData> = {
      "北京": {
        city: "北京", temperature: 28, humidity: 45, condition: "晴", wind: "南风 3级",
      },
      "上海": {
        city: "上海", temperature: 32, humidity: 70, condition: "多云转阴", wind: "东南风 4级",
      },
      "广州": {
        city: "广州", temperature: 35, humidity: 80, condition: "雷阵雨", wind: "西南风 5级",
      },
      "深圳": {
        city: "深圳", temperature: 33, humidity: 78, condition: "阴天", wind: "南风 4级",
      },
    };

    return mockData[city] || {
      city, temperature: 25, humidity: 50, condition: "未知", wind: "无风",
    };
  }

  getNews(): NewsItem[] {
    return [
      {
        title: "人工智能技术取得重大突破",
        summary: "研究团队成功开发出新一代AI芯片，计算效率提升10倍",
        source: "科技日报",
        time: "2026-07-01",
      },
      {
        title: "全球数字货币监管新规出台",
        summary: "多国联合发布数字资产监管框架，明确合规要求",
        source: "财经新闻",
        time: "2026-07-01",
      },
      {
        title: "Web3.0 生态应用快速增长",
        summary: "去中心化应用数量突破100万，用户活跃度创新高",
        source: "区块链日报",
        time: "2026-06-30",
      },
    ];
  }

  getRandomJoke(): JokeItem {
    const jokes: JokeItem[] = [
      { content: `程序员问禅师：“为什么我的代码总出bug？” 禅师拿出一把扫帚：“扫地的时候，你会注意到每一粒灰尘吗？” 程序员恍然大悟：“您的意思是不要追求完美？” 禅师：“不，我的意思是你扫得不够仔细。”`, type: "段子" },
      { content: "产品经理：这个需求很简单，怎么实现我不管。\n程序员：这个实现很复杂，怎么需求我不管。", type: "段子" },
      { content: "QA 测试时发现了3个bug，开发修复了3个bug，QA 回归测试时发现了6个bug，开发修复了6个bug，QA 再次回归测试时发现了12个bug……", type: "段子" },
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  translate(text: string, targetLang = "en"): TranslationResult {
    const mockTranslations: Record<string, string> = {
      "你好": "Hello",
      "谢谢": "Thank you",
      "再见": "Goodbye",
      "今天天气真好": "The weather is nice today",
      "机器人": "Robot",
    };

    return {
      sourceText: text,
      translatedText: mockTranslations[text] || `[模拟翻译] ${text} -> ${targetLang}`,
      sourceLang: "zh",
      targetLang,
    };
  }

  /**
   * 获取模拟 JSON 数据（通用接口，展示 JSON 格式）
   */
  getMockJson(type: string): Record<string, unknown> {
    const mockJsonData: Record<string, Record<string, unknown>> = {
      user: {
        id: 12345,
        name: "测试用户",
        nickname: "Bot Tester",
        level: 5,
        points: 3280,
        isVip: true,
        createdAt: "2026-01-15T08:30:00Z",
      },
      order: {
        orderId: "ORD-20260701-001",
        status: "completed",
        amount: 100,
        currency: "USDT",
        fee: 0.5,
        txHash: "0xabc123def456...",
        createdAt: "2026-07-01T12:00:00Z",
      },
      stats: {
        totalUsers: 15280,
        activeUsers: 3421,
        totalTransactions: 89234,
        volume24h: 1250000,
        avgResponseTime: "0.3s",
        uptime: "99.97%",
      },
      exchange: {
        usdtAmount: 100,
        rate: 16.85,
        estimatedTrx: 1685,
        minAmount: 10,
        maxAmount: 100000,
        fee: "0.5%",
      },
      trust: {
        address: "TF3Tg6xKxU7L6m8kD9nR1pB2qW4eR5tY7uI",
        balance: "1,280.50 USDT",
        totalEnergy: "68,432",
        usedEnergy: "12,150",
        todayEarnings: "3.25 USDT",
        status: "运行中",
      },
      energy: {
        available: 50000,
        unitPrice: 0.08,
        duration: "24 小时",
        minRent: 1000,
        maxRent: 50000,
        totalEnergy: "500,000",
        currentPrice: "0.08 TRX/个",
      },
      duration: {
        plans: [
          { icon: "🥉", name: "体验套餐", price: 10, duration: "1 天" },
          { icon: "🥈", name: "标准套餐", price: 50, duration: "7 天" },
          { icon: "🥇", name: "高级套餐", price: 180, duration: "30 天" },
          { icon: "💎", name: "至尊套餐", price: 500, duration: "90 天" },
        ],
      },
      cmd_energy: {
        commands: [
          { icon: "⚡", name: "/rent", desc: "租能量：/rent 数量" },
          { icon: "📊", name: "/balance", desc: "查询余额" },
          { icon: "📋", name: "/orders", desc: "查看订单" },
          { icon: "🎫", name: "/coupon", desc: "使用优惠券" },
        ],
        tip: "输入 /help 查看所有指令",
      },
    };

    return mockJsonData[type] || { message: "未知数据类型", type };
  }
}

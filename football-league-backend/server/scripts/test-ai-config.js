#!/usr/bin/env node

/**
 * AI足球小助手配置测试脚本
 * 用于验证阿里云DashScope API配置是否正确
 */

const https = require('https');
require('dotenv').config();

const API_KEY = process.env.DASHSCOPE_API_KEY;
const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

console.log('🔍 开始测试AI服务配置...\n');

// 检查API Key
if (!API_KEY) {
  console.error('❌ 错误：未找到 DASHSCOPE_API_KEY 环境变量');
  console.error('请在 .env 文件中配置：DASHSCOPE_API_KEY=sk-your-api-key-here\n');
  process.exit(1);
}

if (API_KEY === 'sk-your-api-key-here') {
  console.error('❌ 错误：请将 DASHSCOPE_API_KEY 替换为真实的API Key');
  console.error('当前值：sk-your-api-key-here\n');
  process.exit(1);
}

console.log('✅ API Key 已配置');
console.log(`   格式检查：${API_KEY.startsWith('sk-') ? '✅ 正确' : '❌ 错误（应以sk-开头）'}`);
console.log(`   长度检查：${API_KEY.length > 20 ? '✅ 正常' : '❌ 异常（长度过短）'}\n`);

// 测试API调用
console.log('🚀 发送测试请求到阿里云DashScope API...\n');

const requestBody = JSON.stringify({
  model: 'qwen-turbo',
  input: {
    messages: [
      {
        role: 'system',
        content: '你是专业的足球赛事AI助手。'
      },
      {
        role: 'user',
        content: '什么是越位规则？请简单解释。'
      }
    ]
  },
  parameters: {
    result_format: 'message',
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 500
  }
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'X-DashScope-SSE': 'disable',
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

const req = https.request(API_URL, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📡 响应状态码：${res.statusCode}\n`);

    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);

        if (response.output && response.output.choices && response.output.choices.length > 0) {
          const answer = response.output.choices[0].message.content;

          console.log('✅ API调用成功！\n');
          console.log('📝 AI回答：');
          console.log('─'.repeat(60));
          console.log(answer);
          console.log('─'.repeat(60));
          console.log('\n✨ 配置测试通过！AI足球小助手已就绪。\n');
        } else {
          console.error('❌ API返回格式异常');
          console.error('响应内容：', JSON.stringify(response, null, 2));
        }
      } catch (error) {
        console.error('❌ 解析响应失败：', error.message);
        console.error('原始响应：', data);
      }
    } else {
      console.error('❌ API调用失败');
      console.error('响应内容：', data);

      try {
        const errorData = JSON.parse(data);
        if (errorData.code === 'InvalidApiKey') {
          console.error('\n💡 提示：API Key无效，请检查：');
          console.error('   1. API Key是否正确复制（注意前后空格）');
          console.error('   2. API Key是否已激活');
          console.error('   3. 阿里云账号是否有余额或免费额度');
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 网络请求失败：', error.message);
  console.error('\n💡 可能的原因：');
  console.error('   1. 网络连接问题');
  console.error('   2. 防火墙阻止了HTTPS请求');
  console.error('   3. 代理配置问题');
});

req.write(requestBody);
req.end();

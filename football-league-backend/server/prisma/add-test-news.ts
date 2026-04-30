import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_NEWS = [
  {
    title: '南京城市2-1力克苏州东吴，积分榜领跑',
    content: '在昨晚进行的苏超联赛第13轮焦点战中，南京城市主场2-1战胜苏州东吴，继续领跑积分榜。上半场第23分钟，南京城市前锋张伟打破僵局，下半场第67分钟，苏州东吴扳平比分，但第89分钟，南京城市凭借角球机会再次取得领先。本场比赛吸引了超过3万名球迷到场观战，现场气氛热烈。',
    read_count: 1523,
    cover_url: '/images/首页推荐图片/0c0180cb06a3221.jpg'
  },
  {
    title: '苏超第3轮：无锡吴钩主场迎战南通支云',
    content: '本周末，苏超联赛第3轮将迎来一场精彩对决，无锡吴钩将在主场迎战南通支云。两队在上赛季交手两次，各取一胜。无锡吴钩主教练表示："我们已经做好了充分准备，希望能在主场拿下三分。"南通支云则表示会全力以赴，争取客场取胜。',
    read_count: 892,
    cover_url: '/images/首页推荐图片/7a5912bae16cf69-scaled.jpg'
  },
  {
    title: '徐州骁龙引援消息：郑智执教首季备战',
    content: '徐州骁龙俱乐部今日宣布，前国脚郑智将担任球队主教练，这是他退役后首次执教职业球队。郑智表示："很荣幸能够加入徐州骁龙，我会用我的经验帮助球队取得更好的成绩。"俱乐部还透露，将在冬季转会窗口引进3-4名实力球员，进一步增强阵容深度。',
    read_count: 2156,
    cover_url: null
  },
  {
    title: '苏超联赛积分榜：南京城市暂居榜首',
    content: '经过13轮激烈角逐，苏超联赛积分榜格局逐渐明朗。南京城市以8胜3平2负积27分暂居榜首，苏州东吴和无锡吴钩分列二三位。本赛季苏超联赛竞争异常激烈，前六名球队积分差距不超过10分，冠军归属仍存在悬念。',
    read_count: 1678,
    cover_url: null
  },
  {
    title: '连云港海港主场首胜，球迷热情高涨',
    content: '连云港海港在主场3-0大胜淮安楚州，取得本赛季主场首胜。赛后，超过2万名球迷在场内高唱队歌，场面感人。主教练表示："这场胜利对球队士气提升很大，感谢球迷们的支持。"连云港海港本赛季表现稳定，目前排名联赛中游。',
    read_count: 743,
    cover_url: '/images/首页推荐图片/7a5912bae16cf69-scaled.jpg'
  },
  {
    title: '苏超青训计划：13支球队共育新星',
    content: '苏超联赛组委会宣布启动"青训共建计划"，13支球队将共同投入资金建设青训体系。计划包括建立省级青训中心、举办青少年联赛、选派优秀球员赴海外培训等。组委会表示："青训是足球发展的根基，我们希望通过这个计划培养更多优秀球员。"',
    read_count: 1234,
    cover_url: '/images/首页推荐图片/6ce0a959e4db596-scaled.jpg'
  },
  {
    title: '全省各地青训热潮：苏超新星辈出',
    content: '随着苏超联赛的蓬勃发展，江苏各地掀起了青训热潮。南京、苏州、无锡等地纷纷建立青训基地，吸引了大量青少年参与足球训练。据统计，目前全省共有超过5万名青少年参加足球培训，其中不乏天赋异禀的小球员。专家预测，未来5年内，苏超将涌现一批优秀的本土球员。',
    read_count: 1567,
    cover_url: '/images/首页推荐图片/6ce0a959e4db596-scaled.jpg'
  },
  {
    title: '主场氛围拉满：南通支云主场坐地三万球迷',
    content: '上周末，南通支云主场对阵徐州骁龙的比赛吸引了超过3万名球迷到场观战，创造了本赛季单场观众人数新高。球迷们身着统一的球衣，挥舞着旗帜，高唱队歌，为球队加油助威。南通支云最终2-1战胜对手，主教练赛后表示："球迷的支持是我们最大的动力。"',
    read_count: 2345,
    cover_url: '/images/首页推荐图片/7a5912bae16cf69-scaled.jpg'
  },
  {
    title: '战术大讨论：本赛季苏超谁能最终封王？',
    content: '随着赛季进入下半程，苏超冠军争夺战愈发激烈。南京城市、苏州东吴、无锡吴钩三支球队形成三足鼎立之势。专家分析认为，南京城市攻守平衡，苏州东吴进攻犀利，无锡吴钩防守稳固，三队各有优势。最终谁能夺冠，还需看接下来的比赛表现。',
    read_count: 1890,
    cover_url: '/images/首页推荐图片/f46e50851fcc163-scaled.jpg'
  },
  {
    title: '苏超 2026 赛季赛程表正式出炉，揭幕战地点选定',
    content: '苏超联赛组委会今日公布了2026赛季完整赛程表。揭幕战将于5月1日在南京奥体中心举行，由卫冕冠军南京城市对阵苏州东吴。本赛季共有13支球队参赛，将进行26轮比赛，预计11月底结束。组委会表示，新赛季将引入VAR技术，提升裁判执法水平。',
    read_count: 3456,
    cover_url: null
  }
];

async function main() {
  console.log('开始添加测试新闻数据...');

  for (const news of TEST_NEWS) {
    const existing = await prisma.news.findFirst({
      where: { title: news.title }
    });

    if (!existing) {
      await prisma.news.create({
        data: news
      });
      console.log(`✅ 已添加: ${news.title}`);
    } else {
      console.log(`⏭️  已存在: ${news.title}`);
    }
  }

  const count = await prisma.news.count();
  console.log(`\n✅ 数据库中共有 ${count} 条新闻`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

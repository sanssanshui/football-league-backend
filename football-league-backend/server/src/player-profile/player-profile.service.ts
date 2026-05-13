import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlayerStyleType } from '@prisma/client';

export interface PlayerProfileInput {
  // 基础身体属性
  height: number;
  weight: number;
  age: number;
  gender: string;
  blood_type?: string;
  body_fat_rate?: number;
  preferred_foot?: string;
  positions: string[];

  // 心肺与耐力属性
  resting_heart_rate?: number;
  max_heart_rate?: number;
  lung_capacity?: number;
  endurance_rating?: number;
  weekly_exercise_count?: number;
  avg_exercise_duration?: number;
  football_years?: number;

  // 力量与爆发属性
  squat_max?: number;
  bench_press_max?: number;
  core_strength_rating?: number;
  explosive_rating?: number;

  // 足球技术属性
  dribbling_rating?: number;
  passing_rating?: number;
  shooting_rating?: number;
  defending_rating?: number;
  vision_rating?: number;
}

export interface PlayerAbilities {
  speed_value: number;
  power_value: number;
  stamina_value: number;
  dribbling_value: number;
  passing_value: number;
  shooting_value: number;
  defending_value: number;
  vision_value: number;
}

export interface PlayerAnalysis {
  abilities: PlayerAbilities;
  player_style: PlayerStyleType;
  style_tags: string[];
  overall_rating: number;
  evaluation: string;
}

@Injectable()
export class PlayerProfileService {
  constructor(private prisma: PrismaService) {}

  // 计算BMI
  private calculateBMI(height: number, weight: number): number {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  }

  // 限制数值范围
  private clamp(value: number, min: number, max: number): number {
    return Math.round(Math.max(min, Math.min(max, value)));
  }

  // 计算速度能力值
  private calculateSpeed(input: PlayerProfileInput, bmi: number): number {
    const { age, explosive_rating = 5, resting_heart_rate = 70 } = input;

    let speed = 30;
    speed += explosive_rating * 5;
    speed += (28 - Math.abs(age - 28)) * 2;
    speed += (60 - resting_heart_rate) * 0.5;
    speed -= Math.abs(bmi - 22) * 2;

    return this.clamp(speed, 10, 100);
  }

  // 计算力量能力值
  private calculatePower(input: PlayerProfileInput): number {
    const { weight, squat_max = 60, bench_press_max = 40, core_strength_rating = 5, age } = input;

    let power = 25;
    power += squat_max * 0.3;
    power += bench_press_max * 0.4;
    power += core_strength_rating * 4;
    power += (32 - Math.abs(age - 32)) * 1;

    return this.clamp(power, 10, 100);
  }

  // 计算耐力能力值
  private calculateStamina(input: PlayerProfileInput): number {
    const {
      weekly_exercise_count = 3,
      avg_exercise_duration = 60,
      resting_heart_rate = 70,
      football_years = 1,
      endurance_rating = 5
    } = input;

    let stamina = 20;
    stamina += weekly_exercise_count * 4;
    stamina += avg_exercise_duration * 0.2;
    stamina += (80 - resting_heart_rate) * 0.5;
    stamina += endurance_rating * 4;
    stamina += football_years * 0.8;

    return this.clamp(stamina, 10, 100);
  }

  // 计算盘带能力值
  private calculateDribbling(input: PlayerProfileInput, bmi: number): number {
    const { dribbling_rating = 5, football_years = 1, age } = input;

    let dribbling = 15;
    dribbling += dribbling_rating * 7;
    dribbling += football_years * 1.2;
    dribbling += (30 - Math.abs(age - 30)) * 1;
    dribbling -= Math.abs(bmi - 22) * 3;

    return this.clamp(dribbling, 10, 100);
  }

  // 计算传球能力值
  private calculatePassing(input: PlayerProfileInput): number {
    const { passing_rating = 5, vision_rating = 5, football_years = 1, age } = input;

    let passing = 15;
    passing += passing_rating * 7;
    passing += vision_rating * 3;
    passing += football_years * 1.5;
    passing += (35 - Math.abs(age - 35)) * 0.8;

    return this.clamp(passing, 10, 100);
  }

  // 计算射门能力值
  private calculateShooting(input: PlayerProfileInput): number {
    const { shooting_rating = 5, explosive_rating = 5, football_years = 1, preferred_foot } = input;

    let shooting = 15;
    shooting += shooting_rating * 8;
    shooting += explosive_rating * 3;
    shooting += football_years * 1.2;
    if (preferred_foot === '双足') shooting += 5;

    return this.clamp(shooting, 10, 100);
  }

  // 计算防守能力值
  private calculateDefending(input: PlayerProfileInput): number {
    const { defending_rating = 5, weight, age, core_strength_rating = 5 } = input;

    let defending = 15;
    defending += defending_rating * 8;
    defending += core_strength_rating * 3;
    defending += weight * 0.3;
    defending += (33 - Math.abs(age - 33)) * 0.8;

    return this.clamp(defending, 10, 100);
  }

  // 计算视野能力值
  private calculateVision(input: PlayerProfileInput): number {
    const { vision_rating = 5, football_years = 1, age, passing_rating = 5 } = input;

    let vision = 20;
    vision += vision_rating * 7;
    vision += passing_rating * 3;
    vision += football_years * 1.5;
    vision += (36 - Math.abs(age - 36)) * 0.7;

    return this.clamp(vision, 10, 100);
  }

  // 生成球员能力值
  generateAbilities(input: PlayerProfileInput): PlayerAbilities {
    const bmi = this.calculateBMI(input.height, input.weight);

    return {
      speed_value: this.calculateSpeed(input, bmi),
      power_value: this.calculatePower(input),
      stamina_value: this.calculateStamina(input),
      dribbling_value: this.calculateDribbling(input, bmi),
      passing_value: this.calculatePassing(input),
      shooting_value: this.calculateShooting(input),
      defending_value: this.calculateDefending(input),
      vision_value: this.calculateVision(input),
    };
  }

  // 判断球员风格
  private determinePlayerStyle(abilities: PlayerAbilities): PlayerStyleType {
    const values = Object.values(abilities);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    // 全能均衡型
    if (values.every(v => v >= 50) && (max - min) <= 30 && avg >= 70) {
      return PlayerStyleType.BALANCED;
    }

    // 速度爆发型
    if (abilities.speed_value >= 80 && abilities.speed_value === max &&
        abilities.power_value >= 60 && abilities.stamina_value >= 60) {
      return PlayerStyleType.SPEED;
    }

    // 力量防守型
    if ((abilities.defending_value >= 80 || abilities.power_value >= 80) &&
        (abilities.defending_value === max || abilities.power_value === max) &&
        abilities.stamina_value >= 60) {
      return PlayerStyleType.POWER;
    }

    // 技术组织型
    if ((abilities.passing_value >= 80 || abilities.dribbling_value >= 80 || abilities.vision_value >= 80) &&
        (abilities.passing_value === max || abilities.dribbling_value === max || abilities.vision_value === max) &&
        abilities.stamina_value >= 60) {
      return PlayerStyleType.TECHNICAL;
    }

    // 射门终结型
    if (abilities.shooting_value >= 80 && abilities.shooting_value === max && abilities.speed_value >= 60) {
      return PlayerStyleType.STRIKER;
    }

    // 业余入门型
    if (values.every(v => v < 50)) {
      return PlayerStyleType.AMATEUR;
    }

    // 默认根据最高属性判断
    if (abilities.speed_value === max) return PlayerStyleType.SPEED;
    if (abilities.power_value === max || abilities.defending_value === max) return PlayerStyleType.POWER;
    if (abilities.shooting_value === max) return PlayerStyleType.STRIKER;
    if (abilities.passing_value === max || abilities.vision_value === max) return PlayerStyleType.TECHNICAL;

    return PlayerStyleType.AMATEUR;
  }

  // 生成风格标签
  private generateStyleTags(abilities: PlayerAbilities, style: PlayerStyleType): string[] {
    const tags: string[] = [];

    if (abilities.speed_value >= 80) tags.push('闪电速度');
    if (abilities.power_value >= 80) tags.push('力量型');
    if (abilities.stamina_value >= 80) tags.push('铁人耐力');
    if (abilities.dribbling_value >= 80) tags.push('盘带大师');
    if (abilities.passing_value >= 80) tags.push('传球精准');
    if (abilities.shooting_value >= 80) tags.push('射门机器');
    if (abilities.defending_value >= 80) tags.push('防守铁闸');
    if (abilities.vision_value >= 80) tags.push('大局观');

    // 根据风格补充标签
    switch (style) {
      case PlayerStyleType.BALANCED:
        if (tags.length < 3) tags.push('全能战士', '均衡发展', '多面手');
        break;
      case PlayerStyleType.SPEED:
        if (tags.length < 3) tags.push('速度型边锋', '突破高手');
        break;
      case PlayerStyleType.POWER:
        if (tags.length < 3) tags.push('防守核心', '身体对抗强');
        break;
      case PlayerStyleType.TECHNICAL:
        if (tags.length < 3) tags.push('技术流', '组织核心');
        break;
      case PlayerStyleType.STRIKER:
        if (tags.length < 3) tags.push('终结者', '得分手');
        break;
      case PlayerStyleType.AMATEUR:
        tags.push('潜力新星', '成长空间大', '基础扎实');
        break;
    }

    return tags.slice(0, 3);
  }

  // 计算加权总评分
  private calculateOverallRating(abilities: PlayerAbilities, positions: string[]): number {
    const weights: Record<string, Partial<Record<keyof PlayerAbilities, number>>> = {
      '门将': { defending_value: 0.3, power_value: 0.3, vision_value: 0.2, stamina_value: 0.2 },
      '后卫': { defending_value: 0.35, power_value: 0.25, stamina_value: 0.2, speed_value: 0.2 },
      '中场': { passing_value: 0.3, vision_value: 0.25, stamina_value: 0.25, dribbling_value: 0.2 },
      '前锋': { shooting_value: 0.35, speed_value: 0.25, dribbling_value: 0.2, power_value: 0.2 },
    };

    // 确定主要位置权重
    let weight = weights['中场']; // 默认中场权重
    if (positions.includes('门将')) weight = weights['门将'];
    else if (positions.some(p => p.includes('后卫'))) weight = weights['后卫'];
    else if (positions.some(p => p.includes('前锋'))) weight = weights['前锋'];

    let overall = 0;
    for (const [key, w] of Object.entries(weight)) {
      overall += abilities[key as keyof PlayerAbilities] * w;
    }

    return Math.round(overall);
  }

  // 生成个性化评语
  private generateEvaluation(abilities: PlayerAbilities, style: PlayerStyleType, input: PlayerProfileInput): string {
    const evaluations: Record<PlayerStyleType, string[]> = {
      [PlayerStyleType.BALANCED]: [
        `这是一位全能型球员，各项能力均衡发展，总评${this.calculateOverallRating(abilities, input.positions)}分。`,
        `在场上能够胜任多个位置，是教练最信赖的多面手。`,
        `继续保持训练强度，有望成为球队的核心球员。`
      ],
      [PlayerStyleType.SPEED]: [
        `速度是你最大的武器！${abilities.speed_value}的速度值让你在边路如鱼得水。`,
        `建议多练习高速带球和突破技巧，配合你的爆发力会更加出色。`,
        `注意加强力量训练，避免在对抗中吃亏。`
      ],
      [PlayerStyleType.POWER]: [
        `强壮的身体素质让你在防守端极具威慑力，${abilities.defending_value}的防守值堪称铁闸。`,
        `继续保持力量训练，同时提升速度和灵活性会让你更加全面。`,
        `你的身体条件非常适合中后卫或后腰位置。`
      ],
      [PlayerStyleType.TECHNICAL]: [
        `出色的技术和视野让你成为球队的组织核心，${abilities.passing_value}的传球能力令人印象深刻。`,
        `建议多观看职业比赛，学习顶级中场的跑位和传球时机。`,
        `提升体能和防守意识，会让你成为更加完美的中场大师。`
      ],
      [PlayerStyleType.STRIKER]: [
        `${abilities.shooting_value}的射门能力让你成为禁区内的终结者！`,
        `继续磨练射门技巧，多练习不同角度和方式的射门。`,
        `提升盘带和速度，会让你在单刀球中更有把握。`
      ],
      [PlayerStyleType.AMATEUR]: [
        `你正处在足球生涯的起步阶段，每一次训练都是进步的机会。`,
        `建议从基础开始，重点提升体能、基本技术和比赛意识。`,
        `保持热情和坚持，假以时日必能看到显著进步！`
      ],
    };

    return evaluations[style].join(' ');
  }

  // 完整分析
  analyzePlayer(input: PlayerProfileInput): PlayerAnalysis {
    const abilities = this.generateAbilities(input);
    const player_style = this.determinePlayerStyle(abilities);
    const style_tags = this.generateStyleTags(abilities, player_style);
    const overall_rating = this.calculateOverallRating(abilities, input.positions);
    const evaluation = this.generateEvaluation(abilities, player_style, input);

    return {
      abilities,
      player_style,
      style_tags,
      overall_rating,
      evaluation,
    };
  }

  // 保存球员档案
  async createProfile(userId: number, input: PlayerProfileInput) {
    const bmi = this.calculateBMI(input.height, input.weight);
    const analysis = this.analyzePlayer(input);

    return this.prisma.playerProfile.create({
      data: {
        user_id: userId,
        // 基础属性
        height: input.height,
        weight: input.weight,
        age: input.age,
        gender: input.gender,
        blood_type: input.blood_type,
        body_fat_rate: input.body_fat_rate,
        bmi,
        preferred_foot: input.preferred_foot,
        positions: JSON.stringify(input.positions),
        // 心肺耐力
        resting_heart_rate: input.resting_heart_rate,
        max_heart_rate: input.max_heart_rate,
        lung_capacity: input.lung_capacity,
        endurance_rating: input.endurance_rating,
        weekly_exercise_count: input.weekly_exercise_count,
        avg_exercise_duration: input.avg_exercise_duration,
        football_years: input.football_years,
        // 力量爆发
        squat_max: input.squat_max,
        bench_press_max: input.bench_press_max,
        core_strength_rating: input.core_strength_rating,
        explosive_rating: input.explosive_rating,
        // 技术属性
        dribbling_rating: input.dribbling_rating,
        passing_rating: input.passing_rating,
        shooting_rating: input.shooting_rating,
        defending_rating: input.defending_rating,
        vision_rating: input.vision_rating,
        // 生成的能力值
        ...analysis.abilities,
        // 风格评价
        player_style: analysis.player_style,
        style_tags: JSON.stringify(analysis.style_tags),
        overall_rating: analysis.overall_rating,
        evaluation: analysis.evaluation,
      },
    });
  }

  // 获取用户的所有档案
  async getUserProfiles(userId: number) {
    return this.prisma.playerProfile.findMany({
      where: { user_id: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 获取单个档案详情
  async getProfileById(id: number, userId: number) {
    return this.prisma.playerProfile.findFirst({
      where: { id, user_id: userId },
    });
  }

  // 删除档案
  async deleteProfile(id: number, userId: number) {
    return this.prisma.playerProfile.deleteMany({
      where: { id, user_id: userId },
    });
  }

  // 更新档案
  async updateProfile(id: number, userId: number, input: PlayerProfileInput) {
    const bmi = this.calculateBMI(input.height, input.weight);
    const analysis = this.analyzePlayer(input);

    return this.prisma.playerProfile.updateMany({
      where: { id, user_id: userId },
      data: {
        height: input.height,
        weight: input.weight,
        age: input.age,
        gender: input.gender,
        blood_type: input.blood_type,
        body_fat_rate: input.body_fat_rate,
        bmi,
        preferred_foot: input.preferred_foot,
        positions: JSON.stringify(input.positions),
        resting_heart_rate: input.resting_heart_rate,
        max_heart_rate: input.max_heart_rate,
        lung_capacity: input.lung_capacity,
        endurance_rating: input.endurance_rating,
        weekly_exercise_count: input.weekly_exercise_count,
        avg_exercise_duration: input.avg_exercise_duration,
        football_years: input.football_years,
        squat_max: input.squat_max,
        bench_press_max: input.bench_press_max,
        core_strength_rating: input.core_strength_rating,
        explosive_rating: input.explosive_rating,
        dribbling_rating: input.dribbling_rating,
        passing_rating: input.passing_rating,
        shooting_rating: input.shooting_rating,
        defending_rating: input.defending_rating,
        vision_rating: input.vision_rating,
        ...analysis.abilities,
        player_style: analysis.player_style,
        style_tags: JSON.stringify(analysis.style_tags),
        overall_rating: analysis.overall_rating,
        evaluation: analysis.evaluation,
      },
    });
  }
}

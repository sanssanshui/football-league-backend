from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, List


def build_tab_url(detail_url: str, encoded_tab: str) -> str:
    target = re.sub(r"tab=[^&]*", f"tab={encoded_tab}", detail_url)
    if "tab=" not in target:
        connector = "&" if "?" in target else "?"
        target += f"{connector}tab={encoded_tab}"
    return target


async def open_situation_tab(page, detail_url: str) -> None:
    await page.goto(build_tab_url(detail_url, "%E8%B5%9B%E5%86%B5"), wait_until="domcontentloaded", timeout=20000)
    await asyncio.sleep(2)


async def extract_header_score(page) -> str | None:
    return await page.evaluate(
        """
        () => {
            const scoreEl = document.querySelector('.score, .match-score, .wa-tiyu-match-head-score');
            if (scoreEl) {
                const scoreText = scoreEl.textContent.trim().replace(/\\s+/g, '');
                const scoreMatch = scoreText.match(/^(\\d{1,2})-(\\d{1,2})$/);
                if (scoreMatch && Number(scoreMatch[1]) <= 9 && Number(scoreMatch[2]) <= 9) return scoreText;
            }
            const matches = [...document.body.innerText.matchAll(/(\\d{1,2})\\s*-\\s*(\\d{1,2})/g)];
            for (const match of matches) {
                const home = Number(match[1]);
                const away = Number(match[2]);
                if (home <= 9 && away <= 9) return `${home}-${away}`;
            }
            return null;
        }
        """
    )


async def extract_header_meta(page) -> Dict[str, str | None]:
    return await page.evaluate(
        """
        () => {
            const lines = Array.from(document.querySelectorAll('body *'))
                .map(node => (node.textContent || '').trim())
                .filter(Boolean);

            const teams = lines.filter(text => text.endsWith('队'));
            const location = lines.find(text => text.includes('体育场') || text.includes('体育中心') || text.includes('足球训练'));

            return {
                homeTeam: teams[0] || null,
                awayTeam: teams[1] || null,
                location: location || null,
            };
        }
        """
    )


async def extract_events(page) -> List[Dict[str, Any]]:
    return await page.evaluate(
        """
        () => {
            const classifyEvent = (text, item) => {
                const normalized = (text || '').replace(/\\s+/g, '');
                let eventType = 'other';
                if (/换下|换上|换人/.test(normalized)) eventType = 'substitution';
                if (/点球不进|点球未进|罚丢|射失点球/.test(normalized)) eventType = 'penalty_missed';
                else if (/点球/.test(normalized)) eventType = 'penalty_goal';
                if (/乌龙/.test(normalized)) eventType = 'own_goal';
                if (/黄牌/.test(normalized)) eventType = 'yellow_card';
                if (/红牌/.test(normalized)) eventType = 'red_card';
                if (/\\(\\d+-\\d+\\)/.test(normalized) && eventType === 'other') eventType = 'goal';

                const elements = item ? item.querySelectorAll('img, i, span, div') : [];
                for (const el of elements) {
                    const src = `${el.src || ''} ${el.alt || ''} ${el.className || ''} ${el.getAttribute('style') || ''}`.toLowerCase();
                    if (src.includes('yellow') || src.includes('hp') || src.includes('huang') || src.includes('bg-amber')) eventType = 'yellow_card';
                    if (src.includes('red') || src.includes('hong') || src.includes('bg-red')) eventType = 'red_card';
                    if (src.includes('own') || src.includes('wulong')) eventType = 'own_goal';
                    if (src.includes('penalty') || src.includes('dianqiu')) eventType = src.includes('miss') || src.includes('fail') ? 'penalty_missed' : 'penalty_goal';
                    if ((src.includes('goal') || src.includes('jq')) && eventType === 'other') eventType = 'goal';
                }
                return eventType;
            };

            const results = [];
            const items = document.querySelectorAll('.match-events-item, [class*="event-item"], [class*="incident"], [class*="timeline"]');
            for (const item of items) {
                const text = item.textContent.trim();
                const minMatch = text.match(/(\\d+)'/);
                if (!minMatch) continue;

                const leftEl = item.querySelector('.events-item-left.show');
                const rightEl = item.querySelector('.events-item-right.show');
                const teamType = leftEl ? 'home' : 'away';
                const eventEl = leftEl || rightEl;
                if (!eventEl) continue;
                const eventTextFull = eventEl.innerText || eventEl.textContent || '';
                const rawLines = eventTextFull.split('\\n').map(l => l.trim()).filter(Boolean);
                
                const lines = [];
                for (let line of rawLines) {
                    if ((line.startsWith('换下') || line.startsWith('↓') || line.startsWith('助攻')) && lines.length > 0) {
                        lines[lines.length - 1] += ' ' + line;
                    } else {
                        lines.push(line);
                    }
                }

                for (const eventText of lines) {
                    let eventType = classifyEvent(`${text} ${eventText}`, item);

                    let player = eventText
                        .replace(/\\(\\d+-\\d+\\)/g, '')
                        .replace(/助攻.*/, '')
                        .replace(/换下.*/, '')
                        .trim();
                    if (!player || player.length > 15) player = eventText.substring(0, 8);

                    let detail = '';
                    if (eventType === 'substitution') {
                        const subMatch = eventText.match(/(?:换下|↓)\\s*([\\u4e00-\\u9fa5·•a-zA-Z0-9]+)/);
                        if (subMatch) detail = '换下' + subMatch[1];
                        else detail = eventText; // fallback to raw
                    } else {
                        const scoreMatch = eventText.match(/\\((\\d+-\\d+)\\)/) || text.match(/\\((\\d+-\\d+)\\)/);
                        if (scoreMatch) detail = scoreMatch[1];
                        const assistMatch = eventText.match(/助攻\\s*(\\S+)/);
                        if (assistMatch) detail += (detail ? ' ' : '') + '助攻:' + assistMatch[1];
                    }

                    results.push({
                        minute: minMatch[1],
                        team_type: teamType,
                        event_type: eventType,
                        player,
                        detail,
                    });
                }
            }
            if (!results.length) {
                const lines = (document.body.innerText || '').split('\\n').map(line => line.trim()).filter(Boolean);
                for (const line of lines) {
                    const minute = line.match(/(\\d{1,3})['’′]/);
                    if (!minute) continue;
                    if (!/(进球|黄牌|红牌|换人|换下|换上|点球)/.test(line)) continue;
                    let eventType = classifyEvent(line, null);
                    const playerMatch = line.replace(/\\d{1,3}['’′]/, '').match(/([\\u4e00-\\u9fa5·]{2,8})/);
                    results.push({
                        minute: minute[1],
                        team_type: 'home',
                        event_type: eventType,
                        player: playerMatch ? playerMatch[1] : '未知球员',
                        detail: line,
                    });
                }
            }
            return results;
        }
        """
    )


async def extract_stats(page) -> Dict[str, Dict[str, str]]:
    return await page.evaluate(
        """
        () => {
            const result = {};
            const statNames = ['进球', '控球率', '进攻', '危险进攻', '射正', '射偏', '角球', '点球', '黄牌', '红牌'];
            const isReasonable = (name, value) => {
                const num = Number(String(value).replace('%', ''));
                if (!Number.isFinite(num)) return false;
                if (name === '控球率') return num >= 0 && num <= 100;
                if (['红牌', '黄牌', '点球', '角球', '进球'].includes(name)) return num >= 0 && num <= 30;
                return num >= 0 && num <= 300;
            };

            const setStat = (name, home, away) => {
                if (home === undefined || away === undefined) return;
                if (!isReasonable(name, home) || !isReasonable(name, away)) return;
                result[name] = { home, away };
            };

            const textLines = (document.body.innerText || '').split('\\n').map(line => line.trim()).filter(Boolean);
            for (const line of textLines) {
                for (const name of statNames) {
                    if (result[name]) continue;
                    const inline = line.match(new RegExp(`^(\\\\d+%?)\\\\s*${name}\\\\s*(\\\\d+%?)$`));
                    if (inline) setStat(name, inline[1], inline[2]);
                }
            }

            const lines = document.querySelectorAll('.statistics-line-tip, [class*="statistics-line"], [class*="stat-row"]');

            for (const line of lines) {
                const text = line.textContent.trim();
                for (const name of statNames) {
                    if (result[name]) continue;
                    const idx = text.indexOf(name);
                    if (idx < 0) continue;
                    const homeVal = text.substring(0, idx).trim();
                    const awayVal = text.substring(idx + name.length).trim();
                    if (/\\d/.test(homeVal) && /\\d/.test(awayVal)) {
                        setStat(name, homeVal.match(/\\d+%?/)?.[0] || homeVal, awayVal.match(/\\d+%?/)?.[0] || awayVal);
                    }
                    break;
                }
            }
            for (let i = 0; i < textLines.length; i += 1) {
                const line = textLines[i];
                for (const name of statNames) {
                    if (result[name]) continue;
                    if (line !== name && !line.includes(name)) continue;
                    const before = textLines[i - 1] || '';
                    const after = textLines[i + 1] || '';
                    const inline = line.match(new RegExp(`(\\\\d+%?)\\\\s*${name}\\\\s*(\\\\d+%?)`));
                    const home = inline ? inline[1] : before.match(/\\d+%?/)?.[0];
                    const away = inline ? inline[2] : after.match(/\\d+%?/)?.[0];
                    setStat(name, home, away);
                }
            }

            if (Object.keys(result).length < 8) {
                const bodyText = (document.body.innerText || '').replace(/\\s+/g, '');
                for (const name of statNames) {
                    if (result[name]) continue;
                    const escapedName = name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
                    const inline = bodyText.match(new RegExp(`(\\\\d{1,3}%?)${escapedName}(\\\\d{1,3}%?)`));
                    if (inline) setStat(name, inline[1], inline[2]);
                }
            }
            return result;
        }
        """
    )


async def scrape_situation(page, detail_url: str) -> Dict[str, Any]:
    await open_situation_tab(page, detail_url)
    meta = await extract_header_meta(page)
    score = await extract_header_score(page)
    events = await extract_events(page)
    stats = await extract_stats(page)
    return {
        "meta": meta,
        "score": score,
        "events": events,
        "stats": stats,
    }

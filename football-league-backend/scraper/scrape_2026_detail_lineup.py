import asyncio
from typing import Any, Dict

from scrape_2026_detail_situation import build_tab_url


async def scrape_lineup(page, detail_url: str) -> Dict[str, Any]:
    try:
        await page.set_viewport_size({"width": 430, "height": 1100})
    except Exception:
        pass
    await page.goto(build_tab_url(detail_url, "%E9%98%B5%E5%AE%B9"), wait_until="domcontentloaded", timeout=15000)
    await asyncio.sleep(2)

    return await page.evaluate(
        """
        () => {
            const result = {
                home: [],
                away: [],
                coaches: { home: null, away: null },
                homeFormation: null,
                awayFormation: null,
                referee: null,
                location: null
            };
            const bodyText = document.body.textContent || '';

            const formationMatches = Array.from(bodyText.matchAll(/\\b([3-5]-[2-5]-[1-4](?:-[1-3])?)\\b/g)).map(match => match[1]);
            result.homeFormation = formationMatches[0] || null;
            result.awayFormation = formationMatches[1] || formationMatches[0] || null;

            const bodyLines = (document.body.innerText || '').split('\\n').map(line => line.trim()).filter(Boolean);
            const refereeLine = bodyLines.find(line => /^(裁判|主裁判|吹哨人)[:：\\s]/.test(line));
            if (refereeLine) {
                const refereeMatch = refereeLine.match(/(?:裁判|主裁判|吹哨人)[:：\\s]*([\\u4e00-\\u9fa5·]{2,8})/);
                if (refereeMatch) result.referee = refereeMatch[1];
            }

            const locationLine = bodyLines.find(line => /(?:体育场|体育中心|足球场)$/.test(line) && line.length <= 22);
            if (locationLine) result.location = locationLine;

            const playerKey = (player) => `${player.number || ''}-${String(player.name || '').replace(/[·•・\\-]/g, '')}`;
            const seenAllPlayers = new Set();
            const addUnique = (target, seenSet, player) => {
                if (!player || !player.name || target.length >= 11) return false;
                const key = playerKey(player);
                if (seenSet.has(key) || seenAllPlayers.has(key)) return false;
                seenSet.add(key);
                seenAllPlayers.add(key);
                target.push({ ...player, role: player.role || 'starter' });
                return true;
            };

            const parsePlayerText = (text) => {
                const compact = (text || '')
                    .replace(/\\d{1,3}(?:\\+\\d+)?['’′]/g, '')
                    .replace(/\\b(?:GK|DF|MF|FW|门将|后卫|中场|前锋|队长|首发|替补)\\b/g, '')
                    .replace(/\\s+/g, '')
                    .trim();
                if (!compact || compact.length > 42) return null;
                const match = compact.match(/^(\\d{1,3})[\\.、]?([\\u4e00-\\u9fa5·•・\\-]{2,18})/);
                if (match) return { number: match[1], name: match[2] };
                const alt = compact.match(/^([\\u4e00-\\u9fa5·•・\\-]{2,18})(\\d{1,3})$/);
                if (alt) return { number: alt[2], name: alt[1] };
                return null;
            };

            const imageSrc = (img) => img ? (img.currentSrc || img.src || img.getAttribute('src')) : null;

            const collectSide = (sideSelector) => {
                const sideEl = document.querySelector(`.lineup-start.${sideSelector}, .lineup-start .${sideSelector}, [class*="lineup-start"][class*="${sideSelector}"], [class*="${sideSelector}"][class*="lineup"]`);
                if (!sideEl || !visible(sideEl)) return [];
                const sideRect = sideEl.getBoundingClientRect();
                const rows = [];
                const seenSide = new Set();

                Array.from(sideEl.querySelectorAll('.lineup-start-pot')).forEach((pot) => {
                    if (!visible(pot)) return;
                    const nameEl = pot.querySelector('.lineup-start-pot-name');
                    const parsed = parsePlayerText(nameEl?.textContent || pot.textContent || '');
                    if (!parsed) return;
                    const key = `${parsed.number}-${parsed.name.replace(/[·•・\\-]/g, '')}`;
                    if (seenSide.has(key)) return;
                    seenSide.add(key);

                    const rect = pot.getBoundingClientRect();
                    const logoImg = pot.querySelector('.lineup-start-pot-logo img');
                    const x = Math.round(((rect.left + rect.width / 2 - sideRect.left) / sideRect.width) * 1000) / 10;
                    const y = Math.round(((rect.top + rect.height / 2 - sideRect.top) / sideRect.height) * 1000) / 10;
                    rows.push({
                        name: parsed.name,
                        number: parsed.number,
                        avatarUrl: imageSrc(logoImg),
                        x: Math.max(0, Math.min(100, x)),
                        y: Math.max(0, Math.min(100, y)),
                        role: 'starter',
                        coordinateSystem: 'baidu_vertical'
                    });
                });

                return rows.slice(0, 11).map((player, index) => ({ ...player, order: index + 1 }));
            };

            const visible = (el) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
            };

            let pitch = null;
            const candidates = Array.from(document.querySelectorAll('div, section')).filter(visible);
            for (const el of candidates) {
                const className = String(el.className || '').toLowerCase();
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const bg = style.backgroundColor || '';
                const looksGreen = bg.includes('rgb') && /rgb\\((?:[0-9]+,\\s*)?(?:8[0-9]|9[0-9]|1[0-5][0-9]),\\s*(?:[2-9][0-9]|1[0-7][0-9])/.test(bg);
                if (
                    rect.width > 300 &&
                    rect.height > 180 &&
                    (className.includes('lineup') || className.includes('formation') || className.includes('field') || className.includes('pitch') || looksGreen)
                ) {
                    if (!pitch || rect.width * rect.height > pitch.getBoundingClientRect().width * pitch.getBoundingClientRect().height) {
                        pitch = el;
                    }
                }
            }

            const directHome = collectSide('left-team');
            const directAway = collectSide('right-team');
            if (directHome.length >= 11 && directAway.length >= 11) {
                result.home = directHome;
                result.away = directAway;
                return result;
            }
            const seenHome = new Set();
            const seenAway = new Set();
            directHome.forEach(player => addUnique(result.home, seenHome, player));
            directAway.forEach(player => addUnique(result.away, seenAway, player));

            const playerEls = [];
            const selector = '[class*="player"], [class*="lineup"], [class*="formation"], [class*="member"], [class*="athlete"]';
            Array.from(document.querySelectorAll(selector)).forEach((el) => {
                if (!visible(el)) return;
                const parsed = parsePlayerText(el.textContent || '');
                if (!parsed) return;
                const rect = el.getBoundingClientRect();
                const img = el.querySelector('img');
                const avatar = img ? (img.currentSrc || img.src || img.getAttribute('src')) : null;
                playerEls.push({ el, rect, parsed, avatar });
            });

            const pitchRect = pitch ? pitch.getBoundingClientRect() : null;
            for (const item of playerEls) {
                let x = null;
                let y = null;
                if (pitchRect) {
                    x = Math.round(((item.rect.left + item.rect.width / 2 - pitchRect.left) / pitchRect.width) * 1000) / 10;
                    y = Math.round(((item.rect.top + item.rect.height / 2 - pitchRect.top) / pitchRect.height) * 1000) / 10;
                    x = Math.max(0, Math.min(100, x));
                    y = Math.max(0, Math.min(100, y));
                }

                const entry = {
                    name: item.parsed.name,
                    number: item.parsed.number,
                    avatarUrl: item.avatar,
                    x,
                    y,
                    role: 'starter'
                };

                if (x !== null) {
                    if (x <= 50) addUnique(result.home, seenHome, entry);
                    else addUnique(result.away, seenAway, entry);
                } else if (result.home.length < 11 && !seenHome.has(playerKey(entry))) {
                    addUnique(result.home, seenHome, entry);
                } else {
                    addUnique(result.away, seenAway, entry);
                }
            }

            for (const line of bodyLines) {
                if (result.home.length >= 11 && result.away.length >= 11) break;
                const parsed = parsePlayerText(line);
                if (!parsed) continue;
                if (['首发阵容', '替补阵容', '技术统计'].includes(parsed.name)) continue;
                const entry = { ...parsed, avatarUrl: null, x: null, y: null, role: 'starter' };
                if (result.home.length < 11 && !seenHome.has(playerKey(entry))) addUnique(result.home, seenHome, entry);
                else addUnique(result.away, seenAway, entry);
            }

            const coachMatch = bodyText.match(/主教练[:：]\\s*(\\S+)/);
            if (coachMatch) result.coaches.home = coachMatch[1];

            result.home = result.home.slice(0, 11).map((player, index) => ({ ...player, order: index + 1 }));
            result.away = result.away.slice(0, 11).map((player, index) => ({ ...player, order: index + 1 }));

            return result;
        }
        """
    )

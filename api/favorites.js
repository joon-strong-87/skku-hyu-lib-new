export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID;
  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  // ── GET: 비밀번호로 즐겨찾기 불러오기 ──
  if (req.method === 'GET') {
    const { password, university } = req.query;
    if (!password || !university) return res.status(400).json({ error: '필수 파라미터 없음' });

    const searchRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: {
          and: [
            { property: 'password', title: { equals: password } },
            { property: 'university', rich_text: { equals: university } }
          ]
        }
      })
    });

    const searchData = await searchRes.json();
    const page = searchData.results?.[0];

    if (!page) return res.status(200).json({ favorites: {} });

    const raw = page.properties.data?.rich_text?.[0]?.plain_text || '{}';
    try {
      return res.status(200).json({ favorites: JSON.parse(raw) });
    } catch {
      return res.status(200).json({ favorites: {} });
    }
  }

  // ── POST: 즐겨찾기 저장/업데이트 ──
  if (req.method === 'POST') {
    const { password, university, favorites } = req.body;
    if (!password || !university) return res.status(400).json({ error: '필수 파라미터 없음' });

    const dataStr = JSON.stringify(favorites || {});

    // 기존 페이지 찾기
    const searchRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: {
          and: [
            { property: 'password', title: { equals: password } },
            { property: 'university', rich_text: { equals: university } }
          ]
        }
      })
    });
    const searchData = await searchRes.json();
    const existing = searchData.results?.[0];

    if (existing) {
      // 기존 페이지 업데이트
      await fetch(`https://api.notion.com/v1/pages/${existing.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          properties: {
            data: { rich_text: [{ text: { content: dataStr.slice(0, 2000) } }] },
            updated: { date: { start: new Date().toISOString() } }
          }
        })
      });
    } else {
      // 새 페이지 생성
      await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parent: { database_id: NOTION_DB_ID },
          properties: {
            password: { title: [{ text: { content: password } }] },
            university: { rich_text: [{ text: { content: university } }] },
            data: { rich_text: [{ text: { content: dataStr.slice(0, 2000) } }] },
            updated: { date: { start: new Date().toISOString() } }
          }
        })
      });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

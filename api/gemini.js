export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { callNumber, title } = req.body;
  if (!callNumber) return res.status(400).json({ error: 'callNumber is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `아래 도서관 청구기호와 책 제목을 보고, 이 책의 주제를 명사구로만 답해줘.

예시:
- "전쟁과 군사전략"
- "도쿄의 역사와 문화"
- "한국전쟁의 역사와 의미"
- "현대 한국 정치사"
- "임상 간호학"

청구기호: ${callNumber}
책 제목: ${title || ''}

규칙:
- 명사구만 출력 (문장 금지)
- 주제의 핵심 의미가 드러나도록 적절한 길이로 작성 (최대 20자)
- 설명, 부연, 줄바꿈, 따옴표 금지`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ result: text.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { callNumber, title } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `아래 도서관 청구기호를 보고, 이 책의 주제를 "~을/를 다루는 책입니다." 형식의 한 문장으로만 답해줘.
청구기호: ${callNumber}
규칙: 반드시 "~을/를 다루는 책입니다."로 끝낼 것. 한 문장만 출력. 설명 금지.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  const data = await response.json();
  if (data.error) return res.status(500).json({ error: data.error.message });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '응답 없음';
  res.status(200).json({ result: text.trim() });
}

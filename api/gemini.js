import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "symbol-2d0d8.firebaseapp.com",
  projectId: "symbol-2d0d8",
  storageBucket: "symbol-2d0d8.firebasestorage.app",
  messagingSenderId: "745645963809",
  appId: "1:745645963809:web:2ece0a87c0bd9061a9c160"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { callNumber, title } = req.body;
  if (!callNumber) return res.status(400).json({ error: 'callNumber is required' });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: 'API key not configured' });

  // 청구기호를 Firestore key로 사용 (슬래시 등 특수문자 인코딩)
  const docId = callNumber.replace(/\//g, '__');

  try {
    // ① Firestore에서 먼저 조회
    const docRef = doc(db, 'subjects', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.log('Firestore 캐시 히트:', callNumber);
      return res.status(200).json({ result: snap.data().subject, cached: true });
    }

    // ② 없으면 Gemini 호출
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`,
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

    const subject = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // ③ Firestore에 저장
    await setDoc(docRef, {
      subject,
      callNumber,
      createdAt: new Date().toISOString()
    });

    return res.status(200).json({ result: subject, cached: false });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

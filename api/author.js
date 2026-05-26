export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { author, title, isbn } = req.query;
  if (!author) return res.status(400).json({ error: 'author 필요' });

  const ALADIN_KEY = process.env.ALADIN_API_KEY;

  try {
    // ISBN으로 알라딘 API 조회
    if (isbn) {
      const url = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${ALADIN_KEY}&itemIdType=ISBN13&ItemId=${isbn}&output=js&Version=20131101&OptResult=authorInfo`;
      const aladinRes = await fetch(url);
      const text = await aladinRes.text();
      const data = JSON.parse(text);
      const items = JSON.parse(data.item || '[]');
      const item = items[0];

      if (item) {
        // authorInfo가 있으면 우선 사용, 없으면 description 사용
        const bio = item.subInfo?.authorInfo?.[0]?.authorInfo
          || item.description
          || null;

        if (bio && bio.trim()) {
          return res.status(200).json({ bio: bio.trim() });
        }
      }
    }

    // ISBN으로 못 가져오면 저자명으로 검색
    const searchUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ALADIN_KEY}&Query=${encodeURIComponent(author)}&QueryType=Author&MaxResults=1&output=js&Version=20131101&OptResult=authorInfo`;
    const searchRes = await fetch(searchUrl);
    const searchText = await searchRes.text();
    const searchData = JSON.parse(searchText);
    const searchItems = JSON.parse(searchData.item || '[]');
    const searchItem = searchItems[0];

    if (searchItem) {
      const bio = searchItem.subInfo?.authorInfo?.[0]?.authorInfo
        || searchItem.description
        || null;
      if (bio && bio.trim()) {
        return res.status(200).json({ bio: bio.trim() });
      }
    }

    return res.status(200).json({ bio: '저자 소개 정보가 없어요.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

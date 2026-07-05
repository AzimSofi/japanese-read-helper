import { NextRequest, NextResponse } from 'next/server';
import { GUEST_KEY_HEADERS } from '@/lib/constants';
import { isAuthenticated } from '@/lib/auth/apiSession';

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage = 'en' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const authed = await isAuthenticated();
    const guestKey = request.headers.get(GUEST_KEY_HEADERS.TRANSLATE);
    if (!authed && !guestKey) {
      return NextResponse.json(
        { error: 'Sign in or add your own Google Translate API key.', requiresGuestKey: 'translate' },
        { status: 401 }
      );
    }

    // Guests use their own key; the owner's key is never used for a guest request.
    const apiKey = authed ? process.env.GOOGLE_TRANSLATE_API_KEY : guestKey;
    if (!apiKey) {
      console.error('GOOGLE_TRANSLATE_API_KEY not configured');
      return NextResponse.json({ error: 'Translation service not configured' }, { status: 500 });
    }

    // Remove furigana before translation
    // 1. Strip HTML ruby tags: <ruby><rb>漢字</rb><rt>ふりがな</rt></ruby> -> 漢字
    // 2. Strip bracket format: 漢字[ふりがな] -> 漢字
    const cleanedText = text
      .replace(/<rt>[^<]*<\/rt>/g, '')
      .replace(/<\/?(?:ruby|rb|rt)>/g, '')
      .replace(/\[([^\]]+)\]/g, '');

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: cleanedText,
          source: 'ja',
          target: targetLanguage,
          format: 'text',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Translate API error:', errorData);
      return NextResponse.json(
        { error: 'Translation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const translatedText = data.data.translations[0].translatedText;

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

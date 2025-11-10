export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

async function getSideContent(
  formData: FormData,
  textKey: string,
): Promise<string> {
  const text = formData.get(textKey) as string | null;
  return text || '';
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const [contentA, contentB] = await Promise.all([
      getSideContent(formData, 'textA'),
      getSideContent(formData, 'textB'),
    ]);

    if (!contentA && !contentB) {
      return NextResponse.json(
        { error: 'No content provided for either side.' },
        { status: 400 },
      );
    }

    const model = 'mistralai/mistral-7b-instruct:free'; 
    const prompt = `
      You are an AI Judge for a mock trial. Analyze the evidence from Side A and Side B and provide an initial, impartial verdict.
      Explain your reasoning clearly.

      --- START SIDE A EVIDENCE ---
      ${contentA}
      --- END SIDE A EVIDENCE ---

      --- START SIDE B EVIDENCE ---
      ${contentB}
      --- END SIDE B EVIDENCE ---

      Your Verdict:
    `;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
    });

    const verdict = completion.choices[0].message.content;

    const newCase = await prisma.case.create({
      data: {
        verdict: verdict || 'No verdict received.',
        documents: {
          create: [
            { side: 'A', content: contentA },
            { side: 'B', content: contentB },
          ],
        },
      },
    });

    return NextResponse.json({
      caseId: newCase.id,
      verdict: newCase.verdict,
    });
  } catch (error) {
    console.error('Error in /api/case POST:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 },
    );
  }
}
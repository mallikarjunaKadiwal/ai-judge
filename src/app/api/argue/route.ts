export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

interface ArgueRequest {
  caseId: string;
  side: 'A' | 'B';
  argumentText: string;
}

export async function POST(req: Request) {
  try {
    const { caseId, side, argumentText }: ArgueRequest = await req.json();

    if (!caseId || !side || !argumentText) {
      return NextResponse.json(
        { error: 'Missing caseId, side, or argumentText' },
        { status: 400 },
      );
    }

    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        documents: true,
        arguments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (existingCase.arguments.length >= 5) {
      return NextResponse.json(
        { error: 'Maximum number of arguments (5) reached.' },
        { status: 403 },
      );
    }

    await prisma.argument.create({
      data: {
        caseId: caseId,
        side: side,
        content: argumentText,
      },
    });

    const originalDocA = existingCase.documents.find((d) => d.side === 'A')?.content || 'N/A';
    const originalDocB = existingCase.documents.find((d) => d.side === 'B')?.content || 'N/A';
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an AI Judge who has already given an initial verdict.
          You must "think again" and re-evaluate your position based on new arguments.
          
          Side A: ${originalDocA}
          Side B: ${originalDocB}
          Your Initial Verdict: ${existingCase.verdict}

          Do not use any markdown formatting.
        `,
      },
    ];

    existingCase.arguments.forEach(arg => {
      messages.push({ role: 'user', content: `Argument from Side ${arg.side}: "${arg.content}"`});
    });

    messages.push({
      role: 'user',
      content: `Here is a new argument from Side ${side}: "${argumentText}". Please provide your re-evaluation.`
    });

    const model = 'mistralai/mistral-7b-instruct:free';
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
    });

    const aiResponse = completion.choices[0].message.content;

    return NextResponse.json({
      aiResponse: aiResponse || 'No response received.',
      argumentFrom: side,
    });

  } catch (error) {
    console.error('Error in /api/argue POST:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 },
    );
  }
}
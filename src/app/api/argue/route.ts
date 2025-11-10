export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai'; // <-- NEW SDK
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

// Initialize the OpenAI Client to point to OpenRouter
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1', // <-- THIS IS THE KEY
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

    // 1. FETCH CASE HISTORY (identical)
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

    // 2. CHECK 5-ARGUMENT CONSTRAINT (identical)
    if (existingCase.arguments.length >= 5) {
      return NextResponse.json(
        { error: 'Maximum number of arguments (5) reached.' },
        { status: 403 },
      );
    }

    // 3. SAVE NEW ARGUMENT (identical)
    await prisma.argument.create({
      data: {
        caseId: caseId,
        side: side,
        content: argumentText,
      },
    });

    // 4. BUILD THE FULL CONTEXT PROMPT
    const originalDocA = existingCase.documents.find((d) => d.side === 'A')?.content || 'N/A';
    const originalDocB = existingCase.documents.find((d) => d.side === 'B')?.content || 'N/A';
    
    // Create the message history
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an AI Judge who has already given an initial verdict.
          You must "think again" and re-evaluate your position based on new arguments.
          
          --- ORIGINAL EVIDENCE & VERDICT ---
          Side A: ${originalDocA}
          Side B: ${originalDocB}
          Your Initial Verdict: ${existingCase.verdict}
          --- END OF CONTEXT ---
        `,
      },
    ];

    // Add the previous chat history
    existingCase.arguments.forEach(arg => {
      messages.push({ role: 'user', content: `Argument from Side ${arg.side}: "${arg.content}"`});
    });

    // Add the NEW argument
    messages.push({
      role: 'user',
      content: `Here is a new argument from Side ${side}: "${argumentText}". Please provide your re-evaluation.`
    });

    // 5. CALL THE OPENROUTER API
    const model = 'mistralai/mistral-7b-instruct:free';
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages, // Send the whole history
    });

    const aiResponse = completion.choices[0].message.content;

    // 6. RETURN RESPONSE (identical)
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
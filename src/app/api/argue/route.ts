export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Define the expected structure of the incoming request
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

    // 1. FETCH THE ENTIRE CASE HISTORY FROM THE DATABASE
    // We use "include" to get all related documents and arguments
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        documents: true, // Get original evidence
        arguments: {
          orderBy: { createdAt: 'asc' }, // Get chat history in order
        },
      },
    });

    if (!existingCase) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 },
      );
    }

    // 2. CHECK THE 5-ARGUMENT CONSTRAINT
    if (existingCase.arguments.length >= 5) {
      return NextResponse.json(
        {
          error:
            'Maximum number of arguments (5) reached.',
        },
        { status: 403 }, // 403 Forbidden is a good code for this
      );
    }

    // 3. SAVE THE NEW ARGUMENT
    // We do this *before* calling the AI
    const newArgument = await prisma.argument.create({
      data: {
        caseId: caseId,
        side: side,
        content: argumentText,
      },
    });

    // 4. BUILD THE FULL CONTEXT PROMPT FOR THE AI
    // This is the most important part.
    const originalDocA = existingCase.documents.find((d) => d.side === 'A')?.content || 'N/A';
    const originalDocB = existingCase.documents.find((d) => d.side === 'B')?.content || 'N/A';

    // Format the argument history
    const history = existingCase.arguments
      .map((arg) => `Side ${arg.side}: "${arg.content}"`)
      .join('\n');

    const prompt = `
      You are an AI Judge who has already given an initial verdict.
      A lawyer is now presenting a new argument. You must "think again" and re-evaluate your position based on this new information.
      You must respond to the new argument directly.

      --- START ORIGINAL SIDE A EVIDENCE ---
      ${originalDocA}
      --- END ORIGINAL SIDE A EVIDENCE ---

      --- START ORIGINAL SIDE B EVIDENCE ---
      ${originalDocB}
      --- END ORIGINAL SIDE B EVIDENCE ---

      --- YOUR INITIAL VERDICT ---
      ${existingCase.verdict}
      --- END INITIAL VERDICT ---

      --- PREVIOUS ARGUMENT HISTORY ---
      ${history.length > 0 ? history : 'None'}
      --- END PREVIOUS ARGUMENT HISTORY ---

      --- NEW ARGUMENT FROM SIDE ${side} ---
      "${argumentText}"
      --- END NEW ARGUMENT ---

      Your Re-evaluation (address the new argument from Side ${side}):
    `;

    // 5. CALL THE GEMINI API
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    // 6. RETURN THE AI'S RESPONSE
    return NextResponse.json({
      aiResponse: aiResponse,
      argumentFrom: side, // We send back which side it was from
    });

  } catch (error) {
    console.error('Error in /api/argue POST:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 },
    );
  }
}
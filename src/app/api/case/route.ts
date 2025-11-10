  export const runtime = 'nodejs';

  import { NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma'; // Our central prisma client
  import { GoogleGenerativeAI } from '@google/generative-ai';
  // We have removed pdf-parse and mammoth

  // Initialize the Gemini AI Client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  /**
   * Helper function to get text from the text input
   */
  async function getSideContent(
    formData: FormData,
    textKey: string, // 'textA' or 'textB'
  ): Promise<string> {
    const text = formData.get(textKey) as string | null;
    return text || ''; // If no text, just return empty string
  }

  // This is the main POST handler for our API route
  export async function POST(req: Request) {
    try {
      const formData = await req.formData();

      // 1. EXTRACT TEXT FROM INPUTS
      // This logic is now inside the POST function
      // and only calls for 'textA' and 'textB'
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

      // 2. CALL THE GEMINI API FOR THE INITIAL VERDICT
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

      const result = await model.generateContent(prompt);
      const verdict = result.response.text();

      // 3. SAVE EVERYTHING TO THE DATABASE IN A SINGLE TRANSACTION
      const newCase = await prisma.case.create({
        data: {
          verdict: verdict, // The AI's verdict
          documents: {
            create: [
              { side: 'A', content: contentA },
              { side: 'B', content: contentB },
            ],
          },
        },
      });

      // 4. RETURN THE NEW CASE ID AND VERDICT TO THE FRONTEND
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
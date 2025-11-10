'use client';

import { useState } from 'react';

// === DEFINE OUR DATA STRUCTURES ===
interface VerdictResponse {
  caseId: string;
  verdict: string;
}

// Represents one "turn" in the argument chat
interface ArgumentTurn {
  from: 'A' | 'B' | 'AI';
  text: string;
}

// Represents the response from our /api/argue
interface ArgueResponse {
  aiResponse: string;
  argumentFrom: 'A' | 'B';
}

/**
 * A reusable component for the argument/chat interface
 */
function ArgumentChat({
  side,
  caseId,
  argumentHistory,
  onNewArgument,
  isLocked,
}: {
  side: 'A' | 'B';
  caseId: string;
  argumentHistory: ArgumentTurn[];
  onNewArgument: (newTurn: ArgumentTurn, aiResponse: ArgumentTurn) => void;
  isLocked: boolean; // To lock the UI during loading
}) {
  const [argumentText, setArgumentText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLocked || !argumentText.trim()) return;

    setError(null);

    try {
      const response = await fetch('/api/argue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseId,
          side: side,
          argumentText: argumentText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Argument failed (Side ${side})`);
      }

      const data: ArgueResponse = await response.json();

      // This is the user's argument
      const userTurn: ArgumentTurn = {
        from: data.argumentFrom,
        text: argumentText,
      };

      // This is the AI's response
      const aiTurn: ArgumentTurn = {
        from: 'AI',
        text: data.aiResponse,
      };

      // Send both new turns back up to the main page
      onNewArgument(userTurn, aiTurn);
      setArgumentText(''); // Clear the input box
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Dynamic colors for A vs B
  const accentColor = side === 'A' ? 'blue' : 'red';

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col h-[60vh]">
      <h3 className={`text-xl font-semibold mb-4 text-${accentColor}-400`}>
        Arguments (Side {side})
      </h3>

      {/* CHAT HISTORY */}
      <div className="flex-grow bg-gray-700 p-4 rounded-md overflow-y-auto mb-4 space-y-4">
        {argumentHistory.length === 0 && (
          <p className="text-gray-400 text-center">No arguments yet.</p>
        )}
        {argumentHistory.map((turn, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg max-w-[85%] ${
              turn.from === side
                ? 'bg-blue-600 ml-auto' // User's argument
                : turn.from === 'AI'
                ? 'bg-gray-600' // AI's response
                : 'bg-red-600' // Opponent's argument
            }`}
          >
            <strong className="block text-sm">
              {turn.from === 'AI' ? 'AI Re-evaluation' : `Side ${turn.from}`}
            </strong>
            <p className="whitespace-pre-wrap">{turn.text}</p>
          </div>
        ))}
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded-md mb-2">
          <strong className="font-bold">Error:</strong> {error}
        </div>
      )}

      {/* ARGUMENT INPUT FORM */}
      <form onSubmit={handleSubmit}>
        <textarea
          rows={3}
          className={`w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-${accentColor}-500 text-gray-100`}
          placeholder={
            isLocked
              ? 'Waiting for response...'
              : 'Type your argument... (Max 5)'
          }
          value={argumentText}
          onChange={(e) => setArgumentText(e.target.value)}
          disabled={isLocked}
        />
        <button
          type="submit"
          className={`w-full mt-2 py-2 px-4 bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white font-bold rounded-lg shadow-md transition duration-300 disabled:bg-gray-500`}
          disabled={isLocked || !argumentText.trim()}
        >
          Submit Argument
        </button>
      </form>
    </div>
  );
}

// === THE MAIN PAGE COMPONENT ===
export default function HomePage() {
  // --- STATE ---
  const [caseId, setCaseId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For initial verdict
  const [error, setError] = useState<string | null>(null);
  const [argumentHistory, setArgumentHistory] = useState<ArgumentTurn[]>([]);

  // --- HANDLERS ---
  const handleInitialSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setArgumentHistory([]); // Clear old arguments on new trial

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/case', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get verdict');
      }

      const data: VerdictResponse = await response.json();
      setCaseId(data.caseId);
      setVerdict(data.verdict);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewArgument = (
    userTurn: ArgumentTurn,
    aiResponse: ArgumentTurn,
  ) => {
    setArgumentHistory((prevHistory) => [
      ...prevHistory,
      userTurn,
      aiResponse,
    ]);
  };

  const isArgumentLoading =
    isLoading ||
    (argumentHistory.length > 0 &&
      argumentHistory[argumentHistory.length - 1].from !== 'AI');

  const maxArgumentsReached =
    argumentHistory.filter((turn) => turn.from !== 'AI').length >= 5;

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-10">AI Judge</h1>

      <form onSubmit={handleInitialSubmit}>
        {/* --- INITIAL TRIAL SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* SIDE A */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Side A</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="textA" className="block text-sm font-medium">
                  Evidence (Text)
                </label>
                <textarea
                  id="textA"
                  name="textA"
                  rows={10}
                  className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste text evidence..."
                  disabled={!!caseId} // Disable after trial starts
                />
              </div>
              {/* FILE INPUT FOR SIDE A IS NOW REMOVED */}
            </div>
          </div>

          {/* AI VERDICT */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
            <h2 className="text-2xl font-semibold mb-4 text-center text-yellow-400">
              AI Verdict
            </h2>
            {!caseId && !isLoading && (
              <button
                type="submit"
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition"
              >
                Start Trial
              </button>
            )}
            {isLoading && (
              <div className="flex justify-center items-center flex-grow">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
              </div>
            )}
            {error && !verdict && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-md">
                <strong>Error:</strong> {error}
              </div>
            )}
            {verdict && (
              <div className="bg-gray-700 p-4 rounded-md h-[40vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Initial Verdict</h3>
                <p className="whitespace-pre-wrap">{verdict}</p>
              </div>
            )}
          </div>

          {/* SIDE B */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-red-400">Side B</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="textB" className="block text-sm font-medium">
                  Evidence (Text)
                </label>
                <textarea
                  id="textB"
                  name="textB"
                  rows={10}
                  className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-red-500"
                  placeholder="Paste text evidence..."
                  disabled={!!caseId} // Disable after trial starts
                />
              </div>
              {/* FILE INPUT FOR SIDE B IS NOW REMOVED */}
            </div>
          </div>
        </div>
      </form>

      {/* --- POST-DECISION ARGUMENT SECTION --- */}
      {caseId && (
        <div className="mt-8">
          {maxArgumentsReached && (
            <div className="text-center p-4 bg-yellow-800 text-white rounded-lg mb-4">
              Maximum (5) arguments have been submitted. This trial is complete.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ArgumentChat
              side="A"
              caseId={caseId}
              argumentHistory={argumentHistory.filter(
                (t) => t.from === 'A' || t.from === 'AI',
              )}
              onNewArgument={handleNewArgument}
              isLocked={isArgumentLoading || maxArgumentsReached}
            />
            <ArgumentChat
              side="B"
              caseId={caseId}
              argumentHistory={argumentHistory.filter(
                (t) => t.from === 'B' || t.from === 'AI',
              )}
              onNewArgument={handleNewArgument}
              isLocked={isArgumentLoading || maxArgumentsReached}
            />
          </div>
        </div>
      )}
    </main>
  );
}
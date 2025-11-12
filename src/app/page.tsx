'use client';

import { useState } from 'react';

interface VerdictResponse {
  caseId: string;
  verdict: string;
}

interface ArgumentTurn {
  from: 'A' | 'B' | 'AI';
  text: string;
}

interface ArgueResponse {
  aiResponse: string;
  argumentFrom: 'A' | 'B';
}

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
  isLocked: boolean;
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

      const userTurn: ArgumentTurn = {
        from: data.argumentFrom,
        text: argumentText,
      };

      const aiTurn: ArgumentTurn = {
        from: 'AI',
        text: data.aiResponse,
      };

      onNewArgument(userTurn, aiTurn);
      setArgumentText('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const accentColor = side === 'A' ? 'blue' : 'red';

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col h-[60vh]">
      <h3 className={`text-xl font-semibold mb-4 text-${accentColor}-400`}>
        Arguments (Side {side})
      </h3>

      <div className="flex-grow bg-gray-700 p-4 rounded-md overflow-y-auto mb-4 space-y-4">
        {argumentHistory.length === 0 && (
          <p className="text-gray-400 text-center">No arguments yet.</p>
        )}
        {argumentHistory.map((turn, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg max-w-[85%] ${
              turn.from === side
                ? 'bg-blue-600 ml-auto'
                : turn.from === 'AI'
                ? 'bg-gray-600'
                : 'bg-red-600'
            }`}
          >
            <strong className="block text-sm">
              {turn.from === 'AI' ? 'AI Re-evaluation' : `Side ${turn.from}`}
            </strong>
            <p className="whitespace-pre-wrap">{turn.text}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded-md mb-2">
          <strong className="font-bold">Error:</strong> {error}
        </div>
      )}

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

export default function HomePage() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [argumentHistory, setArgumentHistory] = useState<ArgumentTurn[]>([]);

  const handleInitialSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setArgumentHistory([]);

    const formData = new FormData(event.currentTarget);

    const fileA = formData.get('fileA') as File;
    const textA = formData.get('textA') as string;
    if (fileA && fileA.size > 0 && textA) {
      setError('Side A: Please provide text *or* a file, not both.');
      setIsLoading(false);
      return;
    }
    const fileB = formData.get('fileB') as File;
    const textB = formData.get('textB') as string;
    if (fileB && fileB.size > 0 && textB) {
      setError('Side B: Please provide text *or* a file, not both.');
      setIsLoading(false);
      return;
    }

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                  disabled={!!caseId}
                />
              </div>
              
              <div>
                <label htmlFor="fileA" className="block text-sm font-medium">
                  Evidence (as .txt file)
                </label>
                <input
                  type="file"
                  id="fileA"
                  name="fileA"
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  accept=".txt"
                  disabled={!!caseId}
                />
              </div>
            </div>
          </div>

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
            {error && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-md">
                <strong>Error:</strong> {error}
              </div>
            )}
            {verdict && !isLoading && (
              <div className="bg-gray-700 p-4 rounded-md h-[40vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2">Initial Verdict</h3>
                <p className="whitespace-pre-wrap">{verdict}</p>
              </div>
            )}
          </div>

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
                  disabled={!!caseId}
                />
              </div>

              <div>
                <label htmlFor="fileB" className="block text-sm font-medium">
                  Evidence (as .txt file)
                </label>
                <input
                  type="file"
                  id="fileB"
                  name="fileB"
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer"
                  accept=".txt"
                  disabled={!!caseId}
                />
              </div>
            </div>
          </div>
        </div>
      </form>

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
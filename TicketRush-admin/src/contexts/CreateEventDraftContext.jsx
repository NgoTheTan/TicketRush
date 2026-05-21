import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CreateEventDraftContext = createContext(null);

export function CreateEventDraftProvider({ children }) {
  const [draft, setDraftState] = useState(null);

  const setDraft = useCallback((nextDraft) => {
    setDraftState({
      ...nextDraft,
      updatedAt: Date.now(),
    });
  }, []);

  const clearDraft = useCallback(() => setDraftState(null), []);

  const value = useMemo(() => ({
    draft,
    setDraft,
    clearDraft,
  }), [draft, setDraft, clearDraft]);

  return (
    <CreateEventDraftContext.Provider value={value}>
      {children}
    </CreateEventDraftContext.Provider>
  );
}

export function useCreateEventDraft() {
  const context = useContext(CreateEventDraftContext);
  if (!context) {
    throw new Error('useCreateEventDraft must be used within CreateEventDraftProvider');
  }
  return context;
}

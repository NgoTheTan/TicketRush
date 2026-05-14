// src/contexts/BookingContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const BookingContext = createContext(null);

const SESSION_KEY_EVENT = 'booking_currentEvent';
const SESSION_KEY_HOLD  = 'booking_holdData';

function readSession(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); }
  catch { return null; }
}

function writeSession(key, value) {
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function BookingProvider({ children }) {
  // Current event being booked — restore from session
  const [currentEvent, setCurrentEventState] = useState(() => readSession(SESSION_KEY_EVENT));

  // Hold state (from holdSeat API response)
  const [holdData, setHoldDataState] = useState(() => readSession(SESSION_KEY_HOLD));

  // Checkout result (from confirmCheckout)
  const [checkoutResult, setCheckoutResult] = useState(null);

  // Pending order created from the current hold
  const [pendingOrder, setPendingOrder] = useState(null);

  // Wrappers that also persist to sessionStorage
  const setCurrentEvent = useCallback((event) => {
    setCurrentEventState(event);
    writeSession(SESSION_KEY_EVENT, event);
  }, []);

  const setHoldData = useCallback((data) => {
    setHoldDataState(data);
    writeSession(SESSION_KEY_HOLD, data);
  }, []);

  // Keep session in sync if holdData expires naturally
  useEffect(() => {
    if (!holdData) return;
    const expiresAt = holdData.expiresAt ? new Date(holdData.expiresAt).getTime() : 0;
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) { writeSession(SESSION_KEY_HOLD, null); return; }
    const id = setTimeout(() => {
      setHoldData(null);
    }, msLeft);
    return () => clearTimeout(id);
  }, [holdData]);

  /**
   * startBooking — bắt đầu flow đặt vé.
   * Chỉ clear hold nếu đang hold cho event KHÁC (tránh xóa hold còn hiệu lực
   * khi user quay lại trang sự kiện tương tự).
   */
  const startBooking = useCallback((event) => {
    const existingEventId = currentEvent?.id ?? readSession(SESSION_KEY_EVENT)?.id;
    if (event?.id !== existingEventId) {
      // Sự kiện khác → xóa hold cũ
      setHoldData(null);
      setPendingOrder(null);
      setCheckoutResult(null);
    }
    setCurrentEvent(event);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent]);

  const updateHold = useCallback((data) => {
    setHoldData(data);
    setPendingOrder(prev => prev?.holdId === data?.holdId ? prev : null);
  }, []);

  const clearHold = useCallback(() => {
    setHoldData(null);
    setPendingOrder(null);
  }, []);

  const setCheckout = useCallback((result) => {
    setCheckoutResult(result);
  }, []);

  const clearBooking = useCallback(() => {
    setCurrentEvent(null);
    setHoldData(null);
    setPendingOrder(null);
    setCheckoutResult(null);
  }, []);

  return (
    <BookingContext.Provider value={{
      currentEvent, setCurrentEvent,
      holdData, updateHold, clearHold,
      pendingOrder, setPendingOrder,
      checkoutResult, setCheckout,
      startBooking, clearBooking,
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}

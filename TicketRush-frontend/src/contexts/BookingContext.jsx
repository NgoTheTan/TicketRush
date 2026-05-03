// src/contexts/BookingContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  // Current event being booked
  const [currentEvent, setCurrentEvent] = useState(null);

  // Hold state (from holdSeat API response)
  const [holdData, setHoldData] = useState(null);
  // { holdId, expiresAt, remainingSeconds, allSelectedSeats, totalAmount }

  // Checkout result (from confirmCheckout)
  const [checkoutResult, setCheckoutResult] = useState(null);
  // { order, tickets[] }

  const startBooking = useCallback((event) => {
    setCurrentEvent(event);
    setHoldData(null);
    setCheckoutResult(null);
  }, []);

  const updateHold = useCallback((data) => {
    setHoldData(data);
  }, []);

  const clearHold = useCallback(() => {
    setHoldData(null);
  }, []);

  const setCheckout = useCallback((result) => {
    setCheckoutResult(result);
  }, []);

  const clearBooking = useCallback(() => {
    setCurrentEvent(null);
    setHoldData(null);
    setCheckoutResult(null);
  }, []);

  return (
    <BookingContext.Provider value={{
      currentEvent, setCurrentEvent,
      holdData, updateHold, clearHold,
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

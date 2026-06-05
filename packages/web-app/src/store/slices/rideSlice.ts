/**
 * @fileoverview Redux Toolkit slice for ride state management.
 * Handles the complete ride lifecycle from request through completion.
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Coordinate, FareEstimate, Ride } from '@tagmytaxi/shared';

interface RideState {
  currentRide: Ride | null;
  status: 'idle' | 'requesting' | 'searching' | 'assigned' | 'in_progress' | 'completed' | 'error';
  fareEstimate: FareEstimate | null;
  driverLocation: Coordinate | null;
  error: string | null;
}

const initialState: RideState = {
  currentRide: null,
  status: 'idle',
  fareEstimate: null,
  driverLocation: null,
  error: null,
};

/**
 * Submits a ride request to the API and returns the created ride.
 */
export const requestRide = createAsyncThunk(
  'ride/requestRide',
  async (payload: { pickup: Coordinate; dropoff: Coordinate; vehicleCategoryId: string }) => {
    const response = await fetch('/api/v1/rides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json() as { message: string };
      throw new Error(error.message);
    }
    return response.json() as Promise<Ride>;
  },
);

/**
 * Cancels the current ride.
 */
export const cancelRide = createAsyncThunk(
  'ride/cancelRide',
  async (rideId: string) => {
    const response = await fetch(`/api/v1/rides/${rideId}/cancel`, { method: 'PATCH' });
    if (!response.ok) {
      const error = await response.json() as { message: string };
      throw new Error(error.message);
    }
    return response.json() as Promise<Ride>;
  },
);

const rideSlice = createSlice({
  name: 'ride',
  initialState,
  reducers: {
    updateDriverLocation(state, action: PayloadAction<Coordinate>) {
      state.driverLocation = action.payload;
    },
    setFareEstimate(state, action: PayloadAction<FareEstimate>) {
      state.fareEstimate = action.payload;
    },
    clearRide(state) {
      state.currentRide = null;
      state.status = 'idle';
      state.fareEstimate = null;
      state.driverLocation = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestRide.pending, (state) => {
        state.status = 'requesting';
        state.error = null;
      })
      .addCase(requestRide.fulfilled, (state, action) => {
        state.currentRide = action.payload;
        state.status = 'searching';
      })
      .addCase(requestRide.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Failed to request ride';
      })
      .addCase(cancelRide.fulfilled, (state, action) => {
        state.currentRide = action.payload;
        state.status = 'idle';
      });
  },
});

export const { updateDriverLocation, setFareEstimate, clearRide } = rideSlice.actions;
export default rideSlice.reducer;

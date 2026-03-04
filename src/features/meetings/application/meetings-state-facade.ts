import { useMeetingsStore } from "@/features/meetings/state";
import { useMemo } from "react";

export function useMeetingsStateFacade() {
  const runtimeMeetingsState = useMeetingsStore((state) => state.meetingsState);
  const selectedMeetingId = useMeetingsStore(
    (state) => state.selectedMeetingId,
  );
  const setSelectedMeetingIdInStore = useMeetingsStore(
    (state) => state.setSelectedMeetingId,
  );

  const meetingsState = useMemo(
    () => ({
      ...runtimeMeetingsState,
      selectedId: selectedMeetingId,
    }),
    [runtimeMeetingsState, selectedMeetingId],
  );

  const setSelectedMeetingId = (meetingId: string | null) => {
    setSelectedMeetingIdInStore(meetingId);
  };

  return {
    meetingsState,
    setSelectedMeetingId,
  };
}

export const meetingsStateFacade = {
  setSelectedMeetingId(meetingId: string | null) {
    useMeetingsStore.getState().setSelectedMeetingId(meetingId);
  },
};

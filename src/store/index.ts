export { store } from "@/store/store";
export type { AppDispatch, RootState } from "@/store/store";
export { useAppDispatch, useAppSelector } from "@/store/hooks";
export { dataActions, dataThunks } from "@/store/data-slices";
export { notesTabsActions } from "@/store/notes-tabs-slice";
export { tasksViewActions } from "@/store/tasks-view-slice";

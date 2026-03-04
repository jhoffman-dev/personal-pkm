import { store, type AppDispatch } from "@/store/store";

export const useAppDispatch = (): AppDispatch => store.dispatch;

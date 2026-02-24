export {};

declare global {
  interface Window {
    pkmDesktop?: {
      aiBaseUrl?: string;
      platform?: string;
      versions?: {
        chrome?: string;
        electron?: string;
        node?: string;
      };
    };
  }
}

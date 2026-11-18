import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { FEED_PAGE_SIZE } from "@inbox/api-client";
import { getApiClient, onItemUpdated } from "../api";

export type FeedFilter = "all" | "attention" | "link" | "text" | "file" | "audio";

/**
 * Infinite feed query (web parity): pages of FEED_PAGE_SIZE, cursor =
 * capturedAt of the oldest loaded item. Live pipeline updates arrive through
 * onItemUpdated (the mobile counterpart of the web's window CustomEvent).
 */
export function useInboxFeed(filter: FeedFilter) {
  const api = getApiClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    return onItemUpdated(() => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["attention-count"] });
    });
  }, [queryClient]);

  return useInfiniteQuery({
    queryKey: ["feed", filter],
    queryFn: ({ pageParam }) =>
      api.listItems({
        cursor: pageParam as string | undefined,
        limit: FEED_PAGE_SIZE,
        filter,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.items.length === 0) return undefined;
      return lastPage.items[0].capturedAt;
    },
  });
}

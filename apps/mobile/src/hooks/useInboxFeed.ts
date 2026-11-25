import { useInfiniteQuery } from "@tanstack/react-query";
import { FEED_PAGE_SIZE } from "@inbox/api-client";
import { getApiClient } from "../api";

export type FeedFilter = "all" | "attention" | "link" | "text" | "file" | "audio";

/**
 * Infinite feed query (web parity): pages of FEED_PAGE_SIZE, cursor =
 * capturedAt of the oldest loaded item. Live pipeline updates come from
 * polling while any loaded item is being processed.
 */
export function useInboxFeed(filter: FeedFilter) {
  const api = getApiClient();

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
    refetchInterval: (query) =>
      query.state.data?.pages.some((p) =>
        p.items.some((i) => i.status === "extracting" || i.status === "annotating"),
      )
        ? 3000
        : false,
  });
}
